"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function setPersonalTramePublication(
  characterSheetId: string,
  enabled: boolean
): Promise<{ token: string | null } | { error: string }> {
  const owner = await requireActivePlayer();
  if (typeof characterSheetId !== "string" || typeof enabled !== "boolean") {
    return { error: "La demande de partage est invalide." };
  }

  if (!enabled) {
    await prisma.personalTramePublication.updateMany({
      where: { characterSheetId, characterSheet: { playerId: owner.id } },
      data: { enabled: false },
    });
    revalidatePath("/player/writing");
    return { token: null };
  }

  const character = await prisma.characterSheet.findFirst({
    where: {
      id: characterSheetId,
      playerId: owner.id,
      chapters: { some: { playerId: owner.id } },
    },
    select: { id: true },
  });
  if (!character) {
    return { error: "Cette trame ne peut pas être partagée." };
  }

  const publication = await prisma.personalTramePublication.upsert({
    where: { characterSheetId: character.id },
    create: {
      characterSheetId: character.id,
      token: randomBytes(32).toString("base64url"),
      enabled: true,
    },
    update: { enabled: true },
    select: { token: true },
  });
  revalidatePath("/player/writing");
  return { token: publication.token };
}
