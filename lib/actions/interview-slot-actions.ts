"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { InterviewBookingStatus, Role } from "@/lib/generated/prisma/enums";

export async function createInterviewSlot(startsAt: Date) {
  await requireRole([Role.ADMIN]);

  if (startsAt < new Date()) {
    throw new Error("Le créneau doit être dans le futur.");
  }

  await prisma.interviewSlot.create({ data: { startsAt } });

  revalidatePath("/staff/interview-slots");
}

export async function deleteInterviewSlot(slotId: string) {
  await requireRole([Role.ADMIN]);

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: { booking: true },
  });
  if (!slot) {
    throw new Error("Ce créneau n'existe plus.");
  }
  if (slot.booking) {
    throw new Error("Ce créneau est déjà réservé et ne peut pas être supprimé.");
  }

  await prisma.interviewSlot.delete({ where: { id: slotId } });

  revalidatePath("/staff/interview-slots");
}

export async function updateInterviewBookingStatus(
  bookingId: string,
  status: InterviewBookingStatus
) {
  const staffUser = await requireRole([Role.ADMIN]);

  const booking = await prisma.interviewBooking.update({
    where: { id: bookingId },
    data: { status, reviewedById: staffUser.id },
  });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${booking.playerId}`);
  revalidatePath("/player/interview");
}
