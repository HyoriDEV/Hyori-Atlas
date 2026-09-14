"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetCommentTarget,
  CharacterSheetStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { notifyPlayerCharacterSheetStatus } from "@/lib/services/discord-bot-service";

const distributionAllowedRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];

export interface DistributionActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function returnPendingSheetsForAffiliationAction(): Promise<
  DistributionActionResult<{ count: number }>
> {
  try {
    const staffUser = await requireRole(distributionAllowedRoles);

    const sheetsToReturn = await prisma.characterSheet.findMany({
      where: {
        reviewStatus: CharacterSheetStatus.PENDING_STAFF,
        player: {
          registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
        },
      },
      include: {
        player: true,
      },
    });

    if (sheetsToReturn.length === 0) {
      return { success: true, data: { count: 0 } };
    }

    const commentBody = "Merci de remplir la section Affiliation de ta fiche personnage !";

    await prisma.$transaction(async (tx) => {
      for (const sheet of sheetsToReturn) {
        await tx.characterSheetComment.deleteMany({
          where: { sheetId: sheet.id },
        });

        await tx.characterSheetComment.create({
          data: {
            sheetId: sheet.id,
            authorId: staffUser.id,
            target: CharacterSheetCommentTarget.name,
            body: commentBody,
          },
        });

        await tx.characterSheet.update({
          where: { id: sheet.id },
          data: {
            reviewStatus: CharacterSheetStatus.PENDING_PLAYER,
            hasUnreadFeedback: true,
          },
        });

        await tx.characterSheetReviewHistory.create({
          data: {
            sheetId: sheet.id,
            authorId: staffUser.id,
            status: CharacterSheetStatus.PENDING_PLAYER,
            commentCount: 1,
            note: "Renvoi groupé : complétion de la section Affiliation",
          },
        });
      }
    });

    // Notify players on Discord if configured
    for (const sheet of sheetsToReturn) {
      if (sheet.player?.discordId) {
        try {
          await notifyPlayerCharacterSheetStatus(
            sheet.player.discordId,
            CharacterSheetStatus.PENDING_PLAYER
          );
        } catch {
          // Ignore individual notification failure
        }
      }
    }

    revalidatePath("/staff/distribution");
    revalidatePath("/staff/atlas");
    revalidatePath("/player/character-sheet");
    revalidatePath("/player", "layout");

    return { success: true, data: { count: sheetsToReturn.length } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors du renvoi des fiches.",
    };
  }
}

export async function createPlayerClassAction(data: {
  name: string;
}): Promise<DistributionActionResult<{ id: string; name: string }>> {
  try {
    await requireRole(distributionAllowedRoles);

    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "Le nom de la classe est obligatoire." };
    }
    if (name.length > 100) {
      return { success: false, error: "Le nom de la classe ne peut pas dépasser 100 caractères." };
    }

    const existing = await prisma.playerClass.findUnique({
      where: { name },
    });

    if (existing) {
      return { success: false, error: "Une classe portant ce nom existe déjà." };
    }

    const lastClass = await prisma.playerClass.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const playerClass = await prisma.playerClass.create({
      data: {
        name,
        order: (lastClass?.order ?? 0) + 1,
      },
      select: { id: true, name: true },
    });

    revalidatePath("/staff/distribution");
    return { success: true, data: playerClass };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la création de la classe.",
    };
  }
}

export async function updatePlayerClassAction(
  id: string,
  data: { name: string }
): Promise<DistributionActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "Le nom de la classe est obligatoire." };
    }
    if (name.length > 100) {
      return { success: false, error: "Le nom de la classe ne peut pas dépasser 100 caractères." };
    }

    const existing = await prisma.playerClass.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (existing) {
      return { success: false, error: "Une autre classe porte déjà ce nom." };
    }

    await prisma.playerClass.update({
      where: { id },
      data: { name },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la mise à jour de la classe.",
    };
  }
}

export async function deletePlayerClassAction(id: string): Promise<DistributionActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    await prisma.playerClass.delete({
      where: { id },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la suppression de la classe.",
    };
  }
}

export async function createPlayerClassRoleAction(data: {
  playerClassId: string;
  name: string;
  ratio: number;
}): Promise<DistributionActionResult<{ id: string; name: string }>> {
  try {
    await requireRole(distributionAllowedRoles);

    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "Le nom du rôle est obligatoire." };
    }
    if (name.length > 100) {
      return { success: false, error: "Le nom du rôle ne peut pas dépasser 100 caractères." };
    }

    const ratio = Math.max(1, Math.round(data.ratio) || 1);

    const existing = await prisma.playerClassRole.findUnique({
      where: {
        playerClassId_name: {
          playerClassId: data.playerClassId,
          name,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Un rôle portant ce nom existe déjà dans cette classe." };
    }

    const lastRole = await prisma.playerClassRole.findFirst({
      where: { playerClassId: data.playerClassId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const playerClassRole = await prisma.playerClassRole.create({
      data: {
        playerClassId: data.playerClassId,
        name,
        ratio,
        order: (lastRole?.order ?? 0) + 1,
      },
      select: { id: true, name: true },
    });

    revalidatePath("/staff/distribution");
    return { success: true, data: playerClassRole };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la création du rôle.",
    };
  }
}

export async function updatePlayerClassRoleAction(
  id: string,
  data: {
    name: string;
    ratio: number;
  }
): Promise<DistributionActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "Le nom du rôle est obligatoire." };
    }
    if (name.length > 100) {
      return { success: false, error: "Le nom du rôle ne peut pas dépasser 100 caractères." };
    }

    const ratio = Math.max(1, Math.round(data.ratio) || 1);

    const currentRole = await prisma.playerClassRole.findUnique({
      where: { id },
    });

    if (!currentRole) {
      return { success: false, error: "Rôle introuvable." };
    }

    const existing = await prisma.playerClassRole.findFirst({
      where: {
        playerClassId: currentRole.playerClassId,
        name,
        id: { not: id },
      },
    });

    if (existing) {
      return { success: false, error: "Un autre rôle porte déjà ce nom dans cette classe." };
    }

    await prisma.playerClassRole.update({
      where: { id },
      data: {
        name,
        ratio,
      },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la mise à jour du rôle.",
    };
  }
}

export async function deletePlayerClassRoleAction(id: string): Promise<DistributionActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    await prisma.playerClassRole.delete({
      where: { id },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la suppression du rôle.",
    };
  }
}

export async function adjustPlayerClassRoleRatioAction(
  id: string,
  delta: number
): Promise<DistributionActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    const currentRole = await prisma.playerClassRole.findUnique({
      where: { id },
    });

    if (!currentRole) {
      return { success: false, error: "Rôle introuvable." };
    }

    const newRatio = Math.max(1, currentRole.ratio + delta);
    if (newRatio === currentRole.ratio) {
      return { success: true };
    }

    await prisma.playerClassRole.update({
      where: { id },
      data: { ratio: newRatio },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de l'ajustement du ratio.",
    };
  }
}
