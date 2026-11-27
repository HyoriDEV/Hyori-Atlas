"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const unavailableTrame = "Cette trame ne peut pas être partagée.";

function eligibleRecipients(ownerId: string, ids?: string[]) {
  return {
    id: { not: ownerId, in: ids },
    registrationStatus: { not: RegistrationStatus.REJECTED },
  };
}

export async function getPersonalTrameShareOptions(characterSheetId: string) {
  const owner = await requireActivePlayer();
  if (typeof characterSheetId !== "string") {
    return { error: unavailableTrame };
  }

  const trame = await prisma.characterSheet.findFirst({
    where: {
      id: characterSheetId,
      playerId: owner.id,
      OR: [{ chapters: { some: { playerId: owner.id } } }, { trameShares: { some: {} } }],
    },
    select: {
      _count: { select: { chapters: { where: { playerId: owner.id } } } },
      trameShares: { select: { recipientId: true } },
    },
  });
  if (!trame) {
    return { error: unavailableTrame };
  }

  const savedIds = trame.trameShares.map(({ recipientId }) => recipientId);
  const players = await prisma.user.findMany({
    where: eligibleRecipients(owner.id, trame._count.chapters === 0 ? savedIds : undefined),
    select: {
      id: true,
      minecraftUsername: true,
      discordDisplayName: true,
      discordUsername: true,
      discordAvatarUrl: true,
    },
  });
  const eligibleIds = new Set(players.map(({ id }) => id));
  return {
    players,
    recipientIds: savedIds.filter((id) => eligibleIds.has(id)),
  };
}

export async function savePersonalTrameShares(characterSheetId: string, recipientIds: string[]) {
  const owner = await requireActivePlayer();
  if (typeof characterSheetId !== "string") {
    return { error: unavailableTrame };
  }
  if (!Array.isArray(recipientIds) || recipientIds.some((id) => typeof id !== "string")) {
    return { error: "La liste de joueurs est invalide." };
  }

  const uniqueIds = [...new Set(recipientIds)];
  const result = await prisma.$transaction(async (tx) => {
    // Serialize replacements of the recipient list for the same trame.
    const ownedTrames = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "character_sheets"
      WHERE "id" = ${characterSheetId} AND "playerId" = ${owner.id}
      FOR UPDATE
    `;
    if (ownedTrames.length === 0) {
      return { error: unavailableTrame };
    }

    const chapter = await tx.chapter.findFirst({
      where: { characterSheetId, playerId: owner.id },
      select: { id: true },
    });
    if (!chapter) {
      const alreadySharedCount = await tx.personalTrameShare.count({
        where: { characterSheetId, recipientId: { in: uniqueIds } },
      });
      if (alreadySharedCount !== uniqueIds.length) {
        return { error: unavailableTrame };
      }
    }

    const eligibleCount = await tx.user.count({
      where: eligibleRecipients(owner.id, uniqueIds),
    });
    if (eligibleCount !== uniqueIds.length) {
      return { error: "Un des joueurs sélectionnés ne peut plus recevoir cette trame." };
    }

    await tx.personalTrameShare.deleteMany({
      where: { characterSheetId, recipientId: { notIn: uniqueIds } },
    });
    if (uniqueIds.length > 0) {
      await tx.personalTrameShare.createMany({
        data: uniqueIds.map((recipientId) => ({ characterSheetId, recipientId })),
        skipDuplicates: true,
      });
    }
    return { success: true };
  });

  if (result.success) {
    revalidatePath("/player/shared-trames");
    revalidatePath("/player/shared-trames/[characterId]", "page");
  }
  return result;
}
