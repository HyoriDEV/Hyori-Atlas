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

function revalidatePlayerAndStaff(playerId: string) {
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${playerId}`);
  revalidatePath(`/staff/atlas/${playerId}/evaluation`);
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
        chosenClasses: [],
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
