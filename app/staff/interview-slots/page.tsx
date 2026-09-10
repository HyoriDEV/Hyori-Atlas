import { cookies } from "next/headers";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerPagePrefs } from "@/lib/table-preferences";
import { Role } from "@/lib/generated/prisma/enums";
import { InterviewSlotsManager } from "@/components/staff/interview-slots/interview-slots-manager";
import type { InterviewSlotItem, InterviewSlotsKPIs } from "@/components/staff/interview-slots/types";

export default async function InterviewSlotsPage() {
  await requireRole([Role.ADMIN]);

  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/interview-slots");

  const slots = await prisma.interviewSlot.findMany({
    include: {
      booking: {
        include: {
          player: {
            include: {
              characterSheets: {
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  reviewStatus: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  let totalUpcoming = 0;
  let totalToday = 0;
  let totalBooked = 0;
  let totalAvailable = 0;
  let totalPast = 0;
  let nextInterviewDate: Date | null = null;

  for (const slot of slots) {
    const d = new Date(slot.startsAt);
    const isPast = d < now;
    const isToday = d >= todayStart && d < todayEnd;

    if (isToday) totalToday++;
    if (!isPast) totalUpcoming++;
    if (slot.booking) {
      if (!isPast) totalBooked++;
      if (d >= now && (!nextInterviewDate || d < nextInterviewDate)) {
        nextInterviewDate = d;
      }
    } else if (!isPast) {
      totalAvailable++;
    }
    if (isPast) totalPast++;
  }

  const kpis: InterviewSlotsKPIs = {
    totalUpcoming,
    totalToday,
    totalBooked,
    totalAvailable,
    totalPast,
    nextInterviewDate,
  };

  const formattedSlots: InterviewSlotItem[] = slots.map((slot) => {
    if (!slot.booking) {
      return {
        id: slot.id,
        startsAt: slot.startsAt,
        createdAt: slot.createdAt,
        booking: null,
      };
    }
    const { characterSheets, ...restPlayer } = slot.booking.player;
    return {
      id: slot.id,
      startsAt: slot.startsAt,
      createdAt: slot.createdAt,
      booking: {
        ...slot.booking,
        player: {
          ...restPlayer,
          characterSheet: characterSheets[0] ?? null,
        },
      },
    };
  });

  return (
    <InterviewSlotsManager
      initialSlots={formattedSlots}
      kpis={kpis}
      initialViewMode={savedPrefs.viewMode as "calendar" | "table" | undefined}
      initialStatusFilter={
        savedPrefs.statusFilter as
          | "all"
          | "today"
          | "upcoming"
          | "booked"
          | "available"
          | "past"
          | undefined
      }
    />
  );
}
