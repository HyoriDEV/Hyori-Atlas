import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  CharacterStatus,
  InterviewBookingStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import {
  characterSheetStatusLabels,
  interviewBookingStatusLabels,
  registrationStatusLabels,
} from "@/lib/navigation";
import { mean } from "@/lib/text-stats";
import {
  countByBucket,
  createTimeline,
  earliestDate,
  resolveTimelineStart,
  sinceFilter,
  type Granularity,
  type LabelledCount,
  type StatisticsRange,
} from "@/lib/services/statistics/timeline";

export interface StageDelay {
  label: string;
  meanMs: number | null;
  sampleSize: number;
}

export interface AdmissionStats {
  totals: {
    registered: number;
    whitelisted: number;
    waitlist: number;
    inProgress: number;
    /** Part des dossiers tranchés (whitelistés + refusés) qui ont été acceptés. */
    acceptanceRate: number | null;
  };
  funnel: LabelledCount[];
  granularity: Granularity;
  timeline: { label: string; registrations: number; whitelistings: number }[];
  periodTotals: { registrations: number; whitelistings: number };
  stageDelays: StageDelay[];
  interviews: {
    upcomingBooked: number;
    upcomingFree: number;
    byStatus: LabelledCount[];
  };
  sheets: {
    byStatus: LabelledCount[];
    /** Demandes de modifications reçues en moyenne par une fiche avant sa validation. */
    averageReviewRounds: number | null;
    validatedCount: number;
  };
}

const FUNNEL_ORDER: RegistrationStatus[] = [
  RegistrationStatus.NEW,
  RegistrationStatus.WAITLIST,
  RegistrationStatus.WHITELIST_IN_PROGRESS,
  RegistrationStatus.WHITELISTED,
  RegistrationStatus.REJECTED,
];

const SHEET_STATUS_ORDER: CharacterSheetStatus[] = [
  CharacterSheetStatus.DRAFT,
  CharacterSheetStatus.PENDING_STAFF,
  CharacterSheetStatus.PENDING_PLAYER,
  CharacterSheetStatus.VALIDATED,
];

const BOOKING_STATUS_ORDER: InterviewBookingStatus[] = [
  InterviewBookingStatus.REGISTERED,
  InterviewBookingStatus.CHANGES_REQUESTED,
  InterviewBookingStatus.ACCEPTED,
];

export async function getAdmissionStats(range: StatisticsRange): Promise<AdmissionStats> {
  const createdInPeriod = sinceFilter(range);

  const [
    statusCounts,
    users,
    statusHistory,
    upcomingSlots,
    upcomingBookedSlots,
    bookingCounts,
    sheetStatusCounts,
    validatedSheets,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["registrationStatus"], _count: { _all: true } }),
    prisma.user.findMany({ select: { id: true, createdAt: true } }),
    prisma.registrationStatusHistory.findMany({
      orderBy: { createdAt: "asc" },
      select: { userId: true, status: true, createdAt: true },
    }),
    prisma.interviewSlot.count({ where: { startsAt: { gte: range.now } } }),
    prisma.interviewSlot.count({
      where: { startsAt: { gte: range.now }, booking: { isNot: null } },
    }),
    prisma.interviewBooking.groupBy({
      by: ["status"],
      where: { createdAt: createdInPeriod },
      _count: { _all: true },
    }),
    prisma.characterSheet.groupBy({
      by: ["reviewStatus"],
      where: { status: CharacterStatus.ACTIVE },
      _count: { _all: true },
    }),
    prisma.characterSheet.findMany({
      where: { reviewStatus: CharacterSheetStatus.VALIDATED },
      select: {
        _count: {
          select: {
            // Une demande de modifications est une revue staff accompagnée de commentaires.
            reviewHistory: {
              where: { status: CharacterSheetStatus.PENDING_PLAYER, commentCount: { gt: 0 } },
            },
          },
        },
      },
    }),
  ]);

  const countOf = (status: RegistrationStatus) =>
    statusCounts.find((entry) => entry.registrationStatus === status)?._count._all ?? 0;
  const whitelisted = countOf(RegistrationStatus.WHITELISTED);
  const rejected = countOf(RegistrationStatus.REJECTED);

  // Première occurrence de chaque statut par joueur.
  const firstStatusAt = new Map<string, Partial<Record<RegistrationStatus, Date>>>();
  for (const entry of statusHistory) {
    const perUser = firstStatusAt.get(entry.userId) ?? {};
    perUser[entry.status] ??= entry.createdAt;
    firstStatusAt.set(entry.userId, perUser);
  }

  const whitelistingDates = statusHistory
    .filter((entry) => entry.status === RegistrationStatus.WHITELISTED)
    .map((entry) => entry.createdAt);
  const registrationDates = users.map((user) => user.createdAt);

  const timeline = createTimeline(
    resolveTimelineStart(range, earliestDate(registrationDates)),
    range.now
  );
  const registrationsByBucket = countByBucket(timeline, registrationDates);
  const whitelistingsByBucket = countByBucket(timeline, whitelistingDates);

  // Un délai est rattaché à la période par la date d'arrivée à l'étape.
  const inPeriod = (date: Date) => !range.since || date >= range.since;
  const delays = {
    toWaitlist: [] as number[],
    toInProgress: [] as number[],
    toWhitelisted: [] as number[],
    total: [] as number[],
  };
  for (const user of users) {
    const steps = firstStatusAt.get(user.id);
    if (!steps) continue;
    const waitlistAt = steps[RegistrationStatus.WAITLIST];
    const inProgressAt = steps[RegistrationStatus.WHITELIST_IN_PROGRESS];
    const whitelistedAt = steps[RegistrationStatus.WHITELISTED];

    if (waitlistAt && inPeriod(waitlistAt) && waitlistAt >= user.createdAt) {
      delays.toWaitlist.push(waitlistAt.getTime() - user.createdAt.getTime());
    }
    if (waitlistAt && inProgressAt && inPeriod(inProgressAt) && inProgressAt >= waitlistAt) {
      delays.toInProgress.push(inProgressAt.getTime() - waitlistAt.getTime());
    }
    if (inProgressAt && whitelistedAt && inPeriod(whitelistedAt) && whitelistedAt >= inProgressAt) {
      delays.toWhitelisted.push(whitelistedAt.getTime() - inProgressAt.getTime());
    }
    if (whitelistedAt && inPeriod(whitelistedAt) && whitelistedAt >= user.createdAt) {
      delays.total.push(whitelistedAt.getTime() - user.createdAt.getTime());
    }
  }

  const stageDelay = (label: string, values: number[]): StageDelay => ({
    label,
    meanMs: mean(values),
    sampleSize: values.length,
  });

  const reviewRounds = validatedSheets.map((sheet) => sheet._count.reviewHistory);

  return {
    totals: {
      registered: users.length,
      whitelisted,
      waitlist: countOf(RegistrationStatus.WAITLIST),
      inProgress: countOf(RegistrationStatus.WHITELIST_IN_PROGRESS),
      acceptanceRate: whitelisted + rejected > 0 ? whitelisted / (whitelisted + rejected) : null,
    },
    funnel: FUNNEL_ORDER.map((status) => ({
      label: registrationStatusLabels[status],
      value: countOf(status),
    })),
    granularity: timeline.granularity,
    timeline: timeline.buckets.map((bucket, index) => ({
      label: bucket.label,
      registrations: registrationsByBucket[index],
      whitelistings: whitelistingsByBucket[index],
    })),
    periodTotals: {
      registrations: registrationsByBucket.reduce((sum, value) => sum + value, 0),
      whitelistings: whitelistingsByBucket.reduce((sum, value) => sum + value, 0),
    },
    stageDelays: [
      stageDelay("Inscription → liste d'attente", delays.toWaitlist),
      stageDelay("Liste d'attente → en whitelist", delays.toInProgress),
      stageDelay("En whitelist → whitelisté·e", delays.toWhitelisted),
      stageDelay("Inscription → whitelisté·e", delays.total),
    ],
    interviews: {
      upcomingBooked: upcomingBookedSlots,
      upcomingFree: upcomingSlots - upcomingBookedSlots,
      byStatus: BOOKING_STATUS_ORDER.map((status) => ({
        label: interviewBookingStatusLabels[status],
        value: bookingCounts.find((entry) => entry.status === status)?._count._all ?? 0,
      })),
    },
    sheets: {
      byStatus: SHEET_STATUS_ORDER.map((status) => ({
        label: characterSheetStatusLabels[status],
        value: sheetStatusCounts.find((entry) => entry.reviewStatus === status)?._count._all ?? 0,
      })),
      averageReviewRounds:
        reviewRounds.length > 0
          ? reviewRounds.reduce((sum, value) => sum + value, 0) / reviewRounds.length
          : null,
      validatedCount: reviewRounds.length,
    },
  };
}
