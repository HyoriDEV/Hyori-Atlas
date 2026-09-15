"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  CharacterStatus,
  Gender,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { notifyPlayerRegistrationStatus } from "@/lib/services/discord-bot-service";

export async function acceptWaitlistPlayer(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      discordId: true,
      characterSheets: {
        where: { status: CharacterStatus.ACTIVE },
        select: { id: true },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WAITLIST },
      data: { registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS },
    });

    await tx.registrationStatusHistory.create({
      data: {
        userId,
        authorId: staffUser.id,
        status: RegistrationStatus.WHITELIST_IN_PROGRESS,
      },
    });

    // Si le joueur n'a aucun personnage actif, on lui initialise automatiquement son premier personnage
    if (targetUser && targetUser.characterSheets.length === 0) {
      const newSheet = await tx.characterSheet.create({
        data: {
          playerId: userId,
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
          note: "Personnage initialisé lors de l'acceptation sur la liste d'attente",
        },
      });
    }
  });

  if (targetUser?.discordId) {
    await notifyPlayerRegistrationStatus(
      targetUser.discordId,
      RegistrationStatus.WHITELIST_IN_PROGRESS
    );
  }

  revalidatePath("/staff/waitlist");
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${userId}`);
  revalidatePath("/player");
  revalidatePath("/player", "layout");
  revalidatePath("/player/character-sheet");
}

export async function rejectWaitlistPlayer(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WAITLIST },
      data: { registrationStatus: RegistrationStatus.REJECTED },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        authorId: staffUser.id,
        status: RegistrationStatus.REJECTED,
      },
    }),
  ]);

  if (targetUser?.discordId) {
    await notifyPlayerRegistrationStatus(
      targetUser.discordId,
      RegistrationStatus.REJECTED
    );
  }

  revalidatePath("/staff/waitlist");
}

export async function restoreWaitlistPlayer(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.REJECTED },
      data: { registrationStatus: RegistrationStatus.WAITLIST },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        authorId: staffUser.id,
        status: RegistrationStatus.WAITLIST,
      },
    }),
  ]);

  if (targetUser?.discordId) {
    await notifyPlayerRegistrationStatus(
      targetUser.discordId,
      RegistrationStatus.WAITLIST
    );
  }

  revalidatePath("/staff/waitlist");
}
