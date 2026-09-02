"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { InterviewBookingStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function bookInterviewSlot(slotId: string) {
  const user = await requireUser();
  const settings = await getGlobalSettings();

  if (!settings.interviewBookingEnabled) {
    throw new Error("Un administrateur a désactivé cette fonctionnalité.");
  }

  if (
    !isRegistrationStatusAtLeast(user.registrationStatus, RegistrationStatus.WHITELIST_IN_PROGRESS)
  ) {
    throw new Error("L'entretien whitelist n'est pas encore disponible.");
  }

  if (user.registrationStatus === RegistrationStatus.WHITELISTED) {
    throw new Error("Tu es déjà whitelisté.");
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

  const existingBooking = await prisma.interviewBooking.findFirst({
    where: {
      playerId: user.id,
      status: { in: [InterviewBookingStatus.REGISTERED, InterviewBookingStatus.ACCEPTED] },
    },
  });

  if (existingBooking) {
    throw new Error("Tu as déjà un entretien réservé.");
  }

  await prisma.interviewBooking.create({
    data: { slotId, playerId: user.id, status: InterviewBookingStatus.REGISTERED },
  });

  revalidatePath("/player/interview");
}
