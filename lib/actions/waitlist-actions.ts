"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, RegistrationStatus } from "@/lib/generated/prisma/enums";

export async function acceptWaitlistPlayer(userId: string) {
  await requireRole([Role.ADMIN]);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WAITLIST },
      data: { registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        status: RegistrationStatus.WHITELIST_IN_PROGRESS,
      },
    }),
  ]);

  revalidatePath("/dashboard/waitlist");
}

export async function rejectWaitlistPlayer(userId: string) {
  await requireRole([Role.ADMIN]);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WAITLIST },
      data: { registrationStatus: RegistrationStatus.REJECTED },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        status: RegistrationStatus.REJECTED,
      },
    }),
  ]);

  revalidatePath("/dashboard/waitlist");
}

export async function restoreWaitlistPlayer(userId: string) {
  await requireRole([Role.ADMIN]);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.REJECTED },
      data: { registrationStatus: RegistrationStatus.WAITLIST },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        status: RegistrationStatus.WAITLIST,
      },
    }),
  ]);

  revalidatePath("/dashboard/waitlist");
}
