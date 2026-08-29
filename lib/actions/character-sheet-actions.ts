"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, Gender, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import {
  ADDITIONAL_COMMENTS_MAX_LENGTH,
  AGE_MAX,
  AGE_MIN,
  BACKGROUND_MAX_LENGTH,
  BACKGROUND_MIN_LENGTH,
  CIVIL_STATUS_MAX_LENGTH,
  CIVIL_STATUS_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  HEIGHT_MAX,
  HEIGHT_MIN,
  MAX_TOTAL_SKILL_POINTS,
  MIN_TOTAL_SKILL_POINTS,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  SKILL_DEFINITIONS,
  isSkillValueValid,
  isTotalSkillPointsValid,
  sumSkillPoints,
  type SkillValues,
} from "@/lib/character-sheet";

export interface CharacterSheetInput {
  name: string;
  nickname: string;
  age: number;
  gender: string;
  civilStatus: string;
  heightCm: number;
  description: string;
  background: string;
  additionalComments: string;
  skills: SkillValues;
}

function revalidateSheetSurfaces(playerId: string) {
  revalidatePath("/player/character-sheet");
  revalidatePath("/player", "layout");
  revalidatePath("/dashboard/atlas");
  revalidatePath(`/dashboard/atlas/${playerId}`);
  revalidatePath(`/dashboard/atlas/${playerId}/evaluation`);
}

function parseAndValidateSheetData(input: CharacterSheetInput, strict: boolean) {
  const name = input.name.trim();
  const nickname = input.nickname.trim();
  const gender = input.gender.trim();
  const civilStatus = input.civilStatus.trim();
  const description = input.description.trim();
  const background = input.background.trim();
  const additionalComments = input.additionalComments.trim();

  if (strict) {
    if (!name || !gender || !civilStatus || !description || !background) {
      throw new Error("Tous les champs obligatoires doivent être remplis.");
    }
    if (!Object.values(Gender).includes(gender as Gender)) {
      throw new Error("Veuillez sélectionner un genre valide.");
    }
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      throw new Error(
        `Le nom doit contenir entre ${NAME_MIN_LENGTH} et ${NAME_MAX_LENGTH} caractères.`
      );
    }
    if (nickname.length > NICKNAME_MAX_LENGTH) {
      throw new Error(`Le surnom ne peut pas dépasser ${NICKNAME_MAX_LENGTH} caractères.`);
    }
    if (
      civilStatus.length < CIVIL_STATUS_MIN_LENGTH ||
      civilStatus.length > CIVIL_STATUS_MAX_LENGTH
    ) {
      throw new Error(
        `Le statut doit contenir entre ${CIVIL_STATUS_MIN_LENGTH} et ${CIVIL_STATUS_MAX_LENGTH} caractères.`
      );
    }
    if (
      description.length < DESCRIPTION_MIN_LENGTH ||
      description.length > DESCRIPTION_MAX_LENGTH
    ) {
      throw new Error(
        `La description doit contenir entre ${DESCRIPTION_MIN_LENGTH} et ${DESCRIPTION_MAX_LENGTH} caractères.`
      );
    }
    if (background.length < BACKGROUND_MIN_LENGTH || background.length > BACKGROUND_MAX_LENGTH) {
      throw new Error(
        `L'histoire doit contenir entre ${BACKGROUND_MIN_LENGTH} et ${BACKGROUND_MAX_LENGTH} caractères.`
      );
    }
    if (additionalComments.length > ADDITIONAL_COMMENTS_MAX_LENGTH) {
      throw new Error(
        `Les commentaires additionnels ne peuvent pas dépasser ${ADDITIONAL_COMMENTS_MAX_LENGTH} caractères.`
      );
    }
    if (!Number.isInteger(input.age) || input.age < AGE_MIN || input.age > AGE_MAX) {
      throw new Error(`L'âge doit être compris entre ${AGE_MIN} et ${AGE_MAX} ans.`);
    }
    if (
      !Number.isInteger(input.heightCm) ||
      input.heightCm < HEIGHT_MIN ||
      input.heightCm > HEIGHT_MAX
    ) {
      throw new Error(`La taille doit être comprise entre ${HEIGHT_MIN}cm et ${HEIGHT_MAX}cm.`);
    }
    for (const skill of SKILL_DEFINITIONS) {
      if (!isSkillValueValid(input.skills[skill.field])) {
        throw new Error(`La compétence ${skill.label} doit être comprise entre 1 et 5.`);
      }
    }
    const totalSkills = sumSkillPoints(input.skills);
    if (!isTotalSkillPointsValid(totalSkills)) {
      throw new Error(
        `La carte de compétences doit totaliser entre ${MIN_TOTAL_SKILL_POINTS} et ${MAX_TOTAL_SKILL_POINTS} points.`
      );
    }
  }

  return {
    name: name || "Sans nom",
    nickname: nickname || null,
    age:
      Number.isInteger(input.age) && input.age >= AGE_MIN && input.age <= AGE_MAX ? input.age : 25,
    gender: Object.values(Gender).includes(gender as Gender) ? (gender as Gender) : Gender.Autre,
    civilStatus: civilStatus || "Citoyen",
    heightMeters:
      Number.isInteger(input.heightCm) && input.heightCm > 0 ? input.heightCm / 100 : 1.75,
    description: description || "",
    background: background || "",
    additionalComments: additionalComments || null,
    ...input.skills,
  };
}

export async function saveCharacterSheetDraft(input: CharacterSheetInput) {
  const user = await requireUser();

  if (
    !isRegistrationStatusAtLeast(user.registrationStatus, RegistrationStatus.WHITELIST_IN_PROGRESS)
  ) {
    throw new Error("La fiche personnage n'est pas encore disponible.");
  }

  const existing = await prisma.characterSheet.findUnique({ where: { playerId: user.id } });
  if (existing?.reviewStatus === CharacterSheetStatus.VALIDATED) {
    throw new Error("Cette fiche a été validée et ne peut plus être modifiée.");
  }
  if (existing?.reviewStatus === CharacterSheetStatus.PENDING_STAFF) {
    throw new Error(
      "Cette fiche est en cours de révision par le staff et ne peut pas être modifiée."
    );
  }

  const data = parseAndValidateSheetData(input, false);

  await prisma.characterSheet.upsert({
    where: { playerId: user.id },
    create: {
      player: { connect: { id: user.id } },
      ...data,
      reviewStatus: CharacterSheetStatus.PENDING_PLAYER,
      hasUnreadFeedback: false,
    },
    update: {
      ...data,
      reviewStatus: CharacterSheetStatus.PENDING_PLAYER,
      hasUnreadFeedback: false,
    },
  });

  revalidateSheetSurfaces(user.id);
}

export async function submitCharacterSheet(input: CharacterSheetInput) {
  const user = await requireUser();

  if (
    !isRegistrationStatusAtLeast(user.registrationStatus, RegistrationStatus.WHITELIST_IN_PROGRESS)
  ) {
    throw new Error("La fiche personnage n'est pas encore disponible.");
  }

  const existing = await prisma.characterSheet.findUnique({ where: { playerId: user.id } });
  if (existing?.reviewStatus === CharacterSheetStatus.VALIDATED) {
    throw new Error("Cette fiche a été validée et ne peut plus être modifiée.");
  }
  if (existing?.reviewStatus === CharacterSheetStatus.PENDING_STAFF) {
    throw new Error("Cette fiche a déjà été transmise au staff.");
  }

  const data = parseAndValidateSheetData(input, true);

  await prisma.$transaction(async (tx) => {
    const sheet = await tx.characterSheet.upsert({
      where: { playerId: user.id },
      create: {
        player: { connect: { id: user.id } },
        ...data,
        reviewStatus: CharacterSheetStatus.PENDING_STAFF,
        hasUnreadFeedback: false,
      },
      update: {
        ...data,
        reviewStatus: CharacterSheetStatus.PENDING_STAFF,
        hasUnreadFeedback: false,
      },
    });

    await tx.characterSheetReviewHistory.create({
      data: {
        sheetId: sheet.id,
        authorId: user.id,
        status: CharacterSheetStatus.PENDING_STAFF,
        commentCount: 0,
        note: "Fiche soumise par le joueur pour évaluation",
      },
    });
  });

  revalidateSheetSurfaces(user.id);
}

export async function upsertCharacterSheet(input: CharacterSheetInput) {
  return submitCharacterSheet(input);
}
