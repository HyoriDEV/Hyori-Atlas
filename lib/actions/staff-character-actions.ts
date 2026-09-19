"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  CharacterStatus,
  Gender,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles, characterStatusLabels } from "@/lib/navigation";
import {
  AGE_MAX,
  AGE_MIN,
  CIVIL_STATUS_MAX_LENGTH,
  CIVIL_STATUS_MIN_LENGTH,
  HEIGHT_MAX,
  HEIGHT_MIN,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  OTHER_ROLE_ID,
  SKILL_DEFINITIONS,
  isSkillValueValid,
  type SkillValues,
} from "@/lib/character-sheet";

function revalidatePlayerAndStaff(playerId: string) {
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${playerId}`);
  revalidatePath(`/staff/atlas/${playerId}/evaluation`);
  revalidatePath(`/staff/atlas/${playerId}/edit`);
  revalidatePath("/staff/distribution");
  revalidatePath("/staff/writing");
  revalidatePath(`/staff/writing/${playerId}`);
  revalidatePath("/player");
  revalidatePath("/player", "layout");
  revalidatePath("/player/character-sheet");
  revalidatePath("/player/writing");
}

export async function createCharacterForPlayer(playerId: string) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheets: {
        where: { status: CharacterStatus.ACTIVE },
      },
    },
  });

  if (!player || player.registrationStatus === RegistrationStatus.REJECTED) {
    throw new Error("Joueur introuvable ou refusé.");
  }

  return await prisma.$transaction(async (tx) => {
    // Si le joueur a déjà un personnage actif, on le désactive pour que le nouveau prenne la place active
    for (const activeSheet of player.characterSheets) {
      await tx.characterSheet.update({
        where: { id: activeSheet.id },
        data: { status: CharacterStatus.DISABLED },
      });
      await tx.characterSheetReviewHistory.create({
        data: {
          sheetId: activeSheet.id,
          authorId: staffUser.id,
          status: activeSheet.reviewStatus,
          commentCount: 0,
          note: "Personnage désactivé suite à l'attribution d'un nouveau personnage",
        },
      });
    }

    // Création du nouveau personnage avec fiche vierge
    const newSheet = await tx.characterSheet.create({
      data: {
        playerId: player.id,
        name: "Nouveau personnage",
        nickname: null,
        age: 25,
        gender: Gender.Autre,
        civilStatus: "Citoyen",
        heightMeters: 1.75,
        description: "",
        background: "",
        additionalComments: null,
        physicalForce: 1,
        physicalEndurance: 1,
        physicalStealth: 1,
        physicalDexterity: 1,
        mentalIntelligence: 1,
        mentalComposure: 1,
        mentalWeaponsMastery: 1,
        socialCharisma: 1,
        socialPersuasion: 1,
        socialViolence: 1,
        status: CharacterStatus.ACTIVE,
        reviewStatus: CharacterSheetStatus.DRAFT,
        hasUnreadFeedback: false,
      },
    });

    await tx.characterSheetReviewHistory.create({
      data: {
        sheetId: newSheet.id,
        authorId: staffUser.id,
        status: CharacterSheetStatus.DRAFT,
        commentCount: 0,
        note: "Nouveau personnage accordé par le staff",
      },
    });

    revalidatePlayerAndStaff(player.id);

    return { success: true, sheetId: newSheet.id };
  });
}

export async function updateCharacterStatus(sheetId: string, newStatus: CharacterStatus) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const sheet = await prisma.characterSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { player: true },
  });

  await prisma.$transaction(async (tx) => {
    if (newStatus === CharacterStatus.ACTIVE) {
      // Désactiver tout autre personnage actuellement actif pour ce joueur
      await tx.characterSheet.updateMany({
        where: {
          playerId: sheet.playerId,
          id: { not: sheetId },
          status: CharacterStatus.ACTIVE,
        },
        data: { status: CharacterStatus.DISABLED },
      });
    }

    await tx.characterSheet.update({
      where: { id: sheetId },
      data: { status: newStatus },
    });

    await tx.characterSheetReviewHistory.create({
      data: {
        sheetId,
        authorId: staffUser.id,
        status: sheet.reviewStatus,
        commentCount: 0,
        note: `Statut du personnage changé en : ${characterStatusLabels[newStatus]}`,
      },
    });
  });

  revalidatePlayerAndStaff(sheet.playerId);
  return { success: true };
}

export interface StaffCharacterSheetUpdateInput {
  name: string;
  nickname?: string | null;
  age: number;
  gender: string;
  civilStatus: string;
  heightCm: number;
  description: string;
  background: string;
  additionalComments?: string | null;
  primaryClassId?: string | null;
  primaryRoleId?: string | null;
  secondaryClassId?: string | null;
  secondaryRoleId?: string | null;
  skills: SkillValues;
}

export async function updateCharacterSheetAsStaff(
  sheetId: string,
  input: StaffCharacterSheetUpdateInput
) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const sheet = await prisma.characterSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { player: true },
  });

  const name = input.name.trim();
  const nickname = input.nickname?.trim() || null;
  const gender = input.gender.trim();
  const civilStatus = input.civilStatus.trim();
  const description = input.description.trim();
  const background = input.background.trim();
  const additionalComments = input.additionalComments?.trim() || null;

  if (!name || name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    throw new Error(
      `Le nom doit contenir entre ${NAME_MIN_LENGTH} et ${NAME_MAX_LENGTH} caractères.`
    );
  }

  if (nickname && nickname.length > NICKNAME_MAX_LENGTH) {
    throw new Error(`Le surnom ne peut pas dépasser ${NICKNAME_MAX_LENGTH} caractères.`);
  }

  if (!Object.values(Gender).includes(gender as Gender)) {
    throw new Error("Choisis un genre valide.");
  }

  if (
    !civilStatus ||
    civilStatus.length < CIVIL_STATUS_MIN_LENGTH ||
    civilStatus.length > CIVIL_STATUS_MAX_LENGTH
  ) {
    throw new Error(
      `Le statut civil doit contenir entre ${CIVIL_STATUS_MIN_LENGTH} et ${CIVIL_STATUS_MAX_LENGTH} caractères.`
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

  if (description.length > 2000) {
    throw new Error("La description ne peut pas dépasser 2000 caractères.");
  }

  if (background.length > 2000) {
    throw new Error("L'histoire ne peut pas dépasser 2000 caractères.");
  }

  if (additionalComments && additionalComments.length > 300) {
    throw new Error("Les commentaires additionnels ne peuvent pas dépasser 300 caractères.");
  }

  for (const skill of SKILL_DEFINITIONS) {
    if (!isSkillValueValid(input.skills[skill.field])) {
      throw new Error(`La compétence ${skill.label} doit être comprise entre 1 et 5.`);
    }
  }

  const primaryClassId = input.primaryClassId?.trim() || null;
  const rawPrimaryRoleId = input.primaryRoleId?.trim() || null;
  const primaryRoleId = rawPrimaryRoleId === OTHER_ROLE_ID ? null : rawPrimaryRoleId;

  const secondaryClassId = input.secondaryClassId?.trim() || null;
  const rawSecondaryRoleId = input.secondaryRoleId?.trim() || null;
  const secondaryRoleId = rawSecondaryRoleId === OTHER_ROLE_ID ? null : rawSecondaryRoleId;

  if (primaryClassId && secondaryClassId && primaryClassId === secondaryClassId) {
    throw new Error("Le deuxième choix doit être une classe différente du premier choix.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.characterSheet.update({
      where: { id: sheetId },
      data: {
        name,
        nickname,
        gender: gender as Gender,
        civilStatus,
        age: input.age,
        heightMeters: input.heightCm / 100,
        description,
        background,
        additionalComments,
        primaryClassId,
        primaryRoleId,
        secondaryClassId,
        secondaryRoleId,
        ...input.skills,
      },
    });

    await tx.characterSheetReviewHistory.create({
      data: {
        sheetId,
        authorId: staffUser.id,
        status: sheet.reviewStatus,
        commentCount: 0,
        note: "Fiche modifiée par le staff",
      },
    });
  });

  revalidatePlayerAndStaff(sheet.playerId);
  return { success: true };
}

