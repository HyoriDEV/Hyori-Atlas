"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { notifyPlayerRegistrationStatus } from "@/lib/services/discord-bot-service";

export async function acceptWaitlistPlayer(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WAITLIST },
      data: { registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        authorId: staffUser.id,
        status: RegistrationStatus.WHITELIST_IN_PROGRESS,
      },
    }),
  ]);

  if (targetUser?.discordId) {
    await notifyPlayerRegistrationStatus(
      targetUser.discordId,
      RegistrationStatus.WHITELIST_IN_PROGRESS
    );
  }

  revalidatePath("/staff/waitlist");
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
