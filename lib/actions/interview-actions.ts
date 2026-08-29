"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { InterviewBookingStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";

export async function bookInterviewSlot(slotId: string) {
  const user = await requireUser();

  if (
    !isRegistrationStatusAtLeast(user.registrationStatus, RegistrationStatus.WHITELIST_IN_PROGRESS)
  ) {
    throw new Error("L'entretien whitelist n'est pas encore disponible.");
  }

  if (user.registrationStatus === RegistrationStatus.WHITELISTED) {
    throw new Error("Vous êtes déjà whitelisté.");
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: { booking: true },
  });
  if (!slot) {
    throw new Error("Ce créneau n'existe plus.");
  }
  if (slot.booking) {
    throw new Error("Ce créneau est déjà réservé.");
  }
  if (slot.startsAt < new Date()) {
    throw new Error("Ce créneau est déjà passé.");
  }

  const latestBooking = await prisma.interviewBooking.findFirst({
    where: { playerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (
    latestBooking &&
    (latestBooking.status === InterviewBookingStatus.REGISTERED ||
      latestBooking.status === InterviewBookingStatus.ACCEPTED)
  ) {
    throw new Error("Vous avez déjà un entretien réservé.");
  }

  await prisma.interviewBooking.create({
    data: { slotId, playerId: user.id, status: InterviewBookingStatus.REGISTERED },
  });

  revalidatePath("/player/interview");
}
