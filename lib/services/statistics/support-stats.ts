import "server-only";

import { prisma } from "@/lib/prisma";
import {
  BdaReportStatus,
  MessageAuthorType,
  SanctionSource,
  SanctionType,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { bdaReportStatusLabels, ticketCategoryLabels } from "@/lib/navigation";
import type { RpTrackingState } from "@/lib/rp-tracking";
import {
  getRpTrackingReplyStats,
  getRpTrackingStates,
  type RpTrackingReplyStats,
} from "@/lib/services/rp-tracking-service";
import { mean } from "@/lib/text-stats";
import {
  createTimeline,
  earliestDate,
  resolveTimelineStart,
  sinceFilter,
  type Granularity,
  type LabelledCount,
  type StatisticsRange,
  type Timeline,
} from "@/lib/services/statistics/timeline";

export const sanctionTypeLabels: Record<SanctionType, string> = {
  [SanctionType.WARNING]: "Avertissement",
  [SanctionType.SUSPENSION]: "Suspension",
  [SanctionType.EXCLUSION]: "Exclusion",
};

const sanctionSourceLabels: Record<SanctionSource, string> = {
  [SanctionSource.WEB]: "Depuis le site",
  [SanctionSource.GAME]: "Depuis le jeu",
};

const BDA_STATUS_ORDER: BdaReportStatus[] = [
  BdaReportStatus.UNREAD,
  BdaReportStatus.RESOLVED,
  BdaReportStatus.ARCHIVED,
];

export type SeriesRow = { label: string } & Record<string, string | number>;

export interface SupportStats {
  tickets: {
    open: number;
    pendingStaff: number;
    createdInPeriod: number;
    /** Délai moyen entre l'ouverture d'un ticket et la première réponse d'un staff. */
    meanFirstReplyMs: number | null;
    repliedCount: number;
    /** Tickets de la période encore ouverts et sans aucune réponse du staff. */
    unansweredCount: number;
    byCategory: LabelledCount[];
    granularity: Granularity;
    timeline: SeriesRow[];
  };
  rpTracking: RpTrackingReplyStats & { counts: Record<RpTrackingState, number> };
  sanctions: {
    inPeriod: number;
    activeNow: number;
    revokedInPeriod: number;
    byType: LabelledCount[];
    bySource: LabelledCount[];
    granularity: Granularity;
    timeline: SeriesRow[];
  };
  bdaReports: {
    byStatus: LabelledCount[];
    createdInPeriod: number;
  };
}

/** Une ligne par tranche de la frise, avec un compteur par valeur de `keys`. */
function stackByBucket<K extends string>(
  timeline: Timeline,
  keys: K[],
  entries: { createdAt: Date; key: K }[]
): SeriesRow[] {
  const rows = new Map<string, SeriesRow>(
    timeline.buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, ...Object.fromEntries(keys.map((key) => [key, 0])) },
    ])
  );
  for (const entry of entries) {
    const bucketKey = timeline.keyOf(entry.createdAt);
    const row = bucketKey ? rows.get(bucketKey) : undefined;
    if (row) {
      row[entry.key] = (row[entry.key] as number) + 1;
    }
  }
  return [...rows.values()];
}

export async function getSupportStats(range: StatisticsRange): Promise<SupportStats> {
  const createdInPeriod = sinceFilter(range);

  const [
    openTickets,
    pendingStaffTickets,
    tickets,
    rpTrackingStates,
    rpTrackingReplies,
    sanctions,
    activeSanctions,
    bdaStatusCounts,
    bdaCreatedInPeriod,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { not: TicketStatus.ARCHIVED } } }),
    prisma.ticket.count({ where: { status: TicketStatus.PENDING_STAFF } }),
    prisma.ticket.findMany({
      where: { createdAt: createdInPeriod },
      select: {
        createdAt: true,
        category: true,
        status: true,
        conversation: {
          select: {
            messages: {
              where: { authorType: MessageAuthorType.STAFF },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    }),
    getRpTrackingStates(),
    getRpTrackingReplyStats(range.since),
    prisma.sanction.findMany({
      where: { createdAt: createdInPeriod },
      select: { type: true, source: true, createdAt: true, revokedAt: true },
    }),
    prisma.sanction.count({
      where: {
        revokedAt: null,
        type: { not: SanctionType.WARNING },
        OR: [{ expiresAt: null }, { expiresAt: { gt: range.now } }],
      },
    }),
    prisma.bdaReport.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.bdaReport.count({ where: { createdAt: createdInPeriod } }),
  ]);

  const firstReplyDelays: number[] = [];
  let unansweredCount = 0;
  for (const ticket of tickets) {
    const firstReply = ticket.conversation.messages[0];
    if (firstReply) {
      firstReplyDelays.push(firstReply.createdAt.getTime() - ticket.createdAt.getTime());
    } else if (ticket.status !== TicketStatus.ARCHIVED) {
      unansweredCount += 1;
    }
  }

  const ticketCategories = Object.values(TicketCategory);
  const ticketTimeline = createTimeline(
    resolveTimelineStart(range, earliestDate(tickets.map((ticket) => ticket.createdAt))),
    range.now
  );

  const sanctionTypes = Object.values(SanctionType);
  const sanctionTimeline = createTimeline(
    resolveTimelineStart(range, earliestDate(sanctions.map((sanction) => sanction.createdAt))),
    range.now
  );

  return {
    tickets: {
      open: openTickets,
      pendingStaff: pendingStaffTickets,
      createdInPeriod: tickets.length,
      meanFirstReplyMs: mean(firstReplyDelays),
      repliedCount: firstReplyDelays.length,
      unansweredCount,
      byCategory: ticketCategories.map((category) => ({
        label: ticketCategoryLabels[category],
        value: tickets.filter((ticket) => ticket.category === category).length,
      })),
      granularity: ticketTimeline.granularity,
      timeline: stackByBucket(
        ticketTimeline,
        ticketCategories,
        tickets.map((ticket) => ({ createdAt: ticket.createdAt, key: ticket.category }))
      ),
    },
    rpTracking: { ...rpTrackingReplies, counts: rpTrackingStates.counts },
    sanctions: {
      inPeriod: sanctions.length,
      activeNow: activeSanctions,
      revokedInPeriod: sanctions.filter((sanction) => sanction.revokedAt).length,
      byType: sanctionTypes.map((type) => ({
        label: sanctionTypeLabels[type],
        value: sanctions.filter((sanction) => sanction.type === type).length,
      })),
      bySource: Object.values(SanctionSource).map((source) => ({
        label: sanctionSourceLabels[source],
        value: sanctions.filter((sanction) => sanction.source === source).length,
      })),
      granularity: sanctionTimeline.granularity,
      timeline: stackByBucket(
        sanctionTimeline,
        sanctionTypes,
        sanctions.map((sanction) => ({ createdAt: sanction.createdAt, key: sanction.type }))
      ),
    },
    bdaReports: {
      byStatus: BDA_STATUS_ORDER.map((status) => ({
        label: bdaReportStatusLabels[status],
        value: bdaStatusCounts.find((entry) => entry.status === status)?._count._all ?? 0,
      })),
      createdInPeriod: bdaCreatedInPeriod,
    },
  };
}
