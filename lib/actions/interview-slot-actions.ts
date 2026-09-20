"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  sendInterviewReminders,
  type InterviewReminderResult,
} from "@/lib/services/discord-bot-service";

export async function createInterviewSlot(startsAt: Date) {
  await requireRole([Role.ADMIN]);

  const targetDate = new Date(startsAt);
  if (isNaN(targetDate.getTime()) || targetDate < new Date()) {
    throw new Error("Le créneau doit être dans le futur.");
  }

  // Vérifier qu'un créneau n'existe pas déjà à la même date et heure
  const existing = await prisma.interviewSlot.findFirst({
    where: { startsAt: targetDate },
  });
  if (existing) {
    throw new Error("Un créneau d'entretien existe déjà à cette date et heure.");
  }

  await prisma.interviewSlot.create({ data: { startsAt: targetDate } });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/player/interview");
}

export async function createBatchInterviewSlots(startsAtList: Date[]) {
  await requireRole([Role.ADMIN]);

  if (!startsAtList || startsAtList.length === 0) {
    throw new Error("Aucun créneau à créer.");
  }

  const now = new Date();
  const validDates = startsAtList
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()) && d > now);

  if (validDates.length === 0) {
    throw new Error("Tous les créneaux sélectionnés sont déjà passés ou invalides.");
  }

  // Récupérer les créneaux déjà existants pour éviter les doublons
  const existingSlots = await prisma.interviewSlot.findMany({
    where: {
      startsAt: {
        in: validDates,
      },
    },
    select: { startsAt: true },
  });

  const existingTimes = new Set(existingSlots.map((s) => s.startsAt.getTime()));
  const toCreate = validDates.filter((d) => !existingTimes.has(d.getTime()));

  if (toCreate.length === 0) {
    throw new Error("Tous les créneaux sélectionnés existent déjà.");
  }

  await prisma.interviewSlot.createMany({
    data: toCreate.map((startsAt) => ({ startsAt })),
  });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/player/interview");

  return { createdCount: toCreate.length, skippedCount: validDates.length - toCreate.length };
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
    throw new Error("Ce créneau est déjà réservé et ne peut pas être supprimé directement.");
  }

  await prisma.interviewSlot.delete({ where: { id: slotId } });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/player/interview");
}

export async function deleteBatchInterviewSlots(slotIds: string[]) {
  await requireRole([Role.ADMIN]);

  if (!slotIds || slotIds.length === 0) {
    return { deletedCount: 0 };
  }

  // Ne supprimer que les créneaux sans réservation
  const unbookedSlots = await prisma.interviewSlot.findMany({
    where: {
      id: { in: slotIds },
      booking: null,
    },
    select: { id: true },
  });

  if (unbookedSlots.length === 0) {
    throw new Error("Aucun créneau libre sélectionné ne peut être supprimé.");
  }

  const unbookedIds = unbookedSlots.map((s) => s.id);
  const result = await prisma.interviewSlot.deleteMany({
    where: {
      id: { in: unbookedIds },
    },
  });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/player/interview");

  return { deletedCount: result.count };
}

export async function deletePastUnbookedSlots() {
  await requireRole([Role.ADMIN]);

  const now = new Date();
  const result = await prisma.interviewSlot.deleteMany({
    where: {
      startsAt: { lt: now },
      booking: null,
    },
  });

  revalidatePath("/staff/interview-slots");
  revalidatePath("/player/interview");

  return { deletedCount: result.count };
}

export async function cancelInterviewBooking(bookingId: string, deleteSlot = false) {
  await requireRole([Role.ADMIN]);

  const booking = await prisma.interviewBooking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });

  if (!booking) {
    throw new Error("Cette réservation n'existe plus.");
  }

  const slotId = booking.slotId;
  const playerId = booking.playerId;

  if (deleteSlot) {
    // Supprimer le créneau (ce qui supprime aussi la réservation par cascade)
    await prisma.interviewSlot.delete({
      where: { id: slotId },
    });
  } else {
    // Supprimer uniquement la réservation pour libérer le créneau
    await prisma.interviewBooking.delete({
      where: { id: bookingId },
    });
  }

  revalidatePath("/staff/interview-slots");
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${playerId}`);
  revalidatePath("/player/interview");
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

export interface EligibleInterviewReminderCandidate {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  characterSheetName?: string;
  hasPreviousBooking: boolean;
  previousBookingStatus?: InterviewBookingStatus;
}

/**
 * Récupère tous les joueurs en statut "En whitelist" avec une fiche RP "Validée"
 * qui n'ont pas encore réservé de créneau d'entretien actif.
 */
export async function getEligibleInterviewReminderCandidatesAction(): Promise<
  EligibleInterviewReminderCandidate[]
> {
  await requireRole([Role.ADMIN]);

  const candidates = await prisma.user.findMany({
    where: {
      registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
      characterSheets: {
        some: {
          reviewStatus: CharacterSheetStatus.VALIDATED,
        },
      },
    },
    select: {
      id: true,
      discordId: true,
      discordUsername: true,
      discordDisplayName: true,
      discordAvatarUrl: true,
      characterSheets: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          reviewStatus: true,
        },
      },
      interviewBookings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          slot: {
            select: {
              startsAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const eligible: EligibleInterviewReminderCandidate[] = [];

  for (const user of candidates) {
    const latestSheet = user.characterSheets[0];
    if (!latestSheet || latestSheet.reviewStatus !== CharacterSheetStatus.VALIDATED) {
      continue;
    }

    const latestBooking = user.interviewBookings[0];
    if (latestBooking) {
      // Déjà validé/accepté : l'entretien a déjà été passé avec succès
      if (latestBooking.status === InterviewBookingStatus.ACCEPTED) {
        continue;
      }
      // Déjà inscrit sur un créneau futur : l'entretien est déjà programmé
      if (
        latestBooking.status === InterviewBookingStatus.REGISTERED &&
        latestBooking.slot &&
        latestBooking.slot.startsAt >= now
      ) {
        continue;
      }
    }

    eligible.push({
      id: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordDisplayName: user.discordDisplayName,
      discordAvatarUrl: user.discordAvatarUrl,
      characterSheetName: latestSheet.name,
      hasPreviousBooking: Boolean(latestBooking),
      previousBookingStatus: latestBooking?.status,
    });
  }

  return eligible;
}

/**
 * Envoie une notification Discord privée à tous les joueurs éligibles pour les inviter
 * à réserver leur créneau d'entretien.
 */
export async function sendInterviewRemindersAction(
  targetUserIds?: string[]
): Promise<InterviewReminderResult> {
  await requireRole([Role.ADMIN]);

  const candidates = await getEligibleInterviewReminderCandidatesAction();
  if (candidates.length === 0) {
    return {
      success: true,
      total: 0,
      sent: 0,
      dmClosed: 0,
      failed: 0,
      message: "Aucun joueur éligible à relancer pour le moment.",
    };
  }

  // Si une liste d'utilisateurs cibles est spécifiée, filtrer selon ces IDs
  const filteredCandidates =
    targetUserIds && targetUserIds.length > 0
      ? candidates.filter((c) => targetUserIds.includes(c.id))
      : candidates;

  if (filteredCandidates.length === 0) {
    return {
      success: true,
      total: 0,
      sent: 0,
      dmClosed: 0,
      failed: 0,
      message: "Aucun joueur sélectionné à relancer.",
    };
  }

  const discordIds = filteredCandidates.map((c) => c.discordId);
  const result = await sendInterviewReminders(discordIds);

  revalidatePath("/staff/interview-slots");

  return result;
}
