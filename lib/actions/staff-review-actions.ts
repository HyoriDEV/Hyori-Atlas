"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus, Role } from "@/lib/generated/prisma/enums";

export async function validateCharacterSheet(sheetId: string) {
  await requireRole([Role.ADMIN]);

  const sheet = await prisma.characterSheet.update({
    where: { id: sheetId },
    data: { reviewStatus: CharacterSheetStatus.VALIDATED },
  });

  revalidatePath("/dashboard/atlas");
  revalidatePath(`/dashboard/atlas/${sheet.playerId}`);
}

export async function requestCharacterSheetChanges(sheetId: string) {
  await requireRole([Role.ADMIN]);

  const sheet = await prisma.characterSheet.update({
    where: { id: sheetId },
    data: { reviewStatus: CharacterSheetStatus.CHANGES_REQUESTED },
  });

  revalidatePath("/dashboard/atlas");
  revalidatePath(`/dashboard/atlas/${sheet.playerId}`);
}

export async function promoteToWhitelisted(userId: string) {
  await requireRole([Role.ADMIN]);

  const sheet = await prisma.characterSheet.findUnique({ where: { playerId: userId } });
  if (!sheet) {
    throw new Error("Ce joueur n'a pas encore de fiche personnage.");
  }

  await prisma.$transaction([
    prisma.characterSheet.update({
      where: { id: sheet.id },
      data: { reviewStatus: CharacterSheetStatus.VALIDATED },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { registrationStatus: RegistrationStatus.WHITELISTED },
    }),
    prisma.registrationStatusHistory.create({
      data: { userId, status: RegistrationStatus.WHITELISTED },
    }),
  ]);

  revalidatePath("/dashboard/atlas");
  revalidatePath(`/dashboard/atlas/${userId}`);
}
