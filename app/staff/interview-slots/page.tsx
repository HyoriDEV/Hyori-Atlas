import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { InterviewSlotsManager } from "@/components/staff/interview-slots/interview-slots-manager";
import type { InterviewSlotsKPIs } from "@/components/staff/interview-slots/types";

export default async function InterviewSlotsPage() {
  await requireRole([Role.ADMIN]);

  const slots = await prisma.interviewSlot.findMany({
    include: {
      booking: {
        include: {
          player: {
            include: {
              characterSheet: {
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

  return <InterviewSlotsManager initialSlots={slots} kpis={kpis} />;
}
