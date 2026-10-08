import { getParisParts } from "@/lib/date";
import type { StatisticsPeriod } from "@/lib/statistics";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

const SHORT_MONTH_NAMES_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export interface LabelledCount {
  label: string;
  value: number;
}

export interface StatisticsRange {
  /** Début de la période, `null` pour « depuis le début ». */
  since: Date | null;
  now: Date;
}

export function resolveStatisticsRange(period: StatisticsPeriod): StatisticsRange {
  const now = new Date();
  if (period === "all") {
    return { since: null, now };
  }
  return { since: new Date(now.getTime() - Number(period) * DAY_MS), now };
}

/**
 * Jour calendaire de Paris d'un instant, représenté comme minuit UTC de ce jour : cela permet
 * de faire de l'arithmétique de dates sans se soucier des changements d'heure.
 */
export function parisDayUtc(date: Date): number {
  const parts = getParisParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export type Granularity = "day" | "week" | "month";

function pickGranularity(startDayUtc: number, endDayUtc: number): Granularity {
  const days = (endDayUtc - startDayUtc) / DAY_MS + 1;
  if (days <= 31) return "day";
  if (days <= 182) return "week";
  return "month";
}

function bucketStartUtc(dayUtc: number, granularity: Granularity): number {
  if (granularity === "day") return dayUtc;
  const day = new Date(dayUtc);
  if (granularity === "week") {
    // Semaines du lundi au dimanche.
    return dayUtc - ((day.getUTCDay() + 6) % 7) * DAY_MS;
  }
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1);
}

function nextBucketStartUtc(bucketUtc: number, granularity: Granularity): number {
  if (granularity === "day") return bucketUtc + DAY_MS;
  if (granularity === "week") return bucketUtc + 7 * DAY_MS;
  const day = new Date(bucketUtc);
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1);
}

function bucketLabel(bucketUtc: number, granularity: Granularity): string {
  const day = new Date(bucketUtc);
  if (granularity === "month") {
    return `${SHORT_MONTH_NAMES_FR[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
  }
  const label = `${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
  return granularity === "week" ? `sem. ${label}` : label;
}

export interface TimelineBucket {
  key: string;
  label: string;
}

export interface Timeline {
  granularity: Granularity;
  buckets: TimelineBucket[];
  /** Clé de la tranche contenant `date`, ou `null` si elle est hors de la période. */
  keyOf(date: Date): string | null;
}

const granularityLabels: Record<Granularity, string> = {
  day: "par jour",
  week: "par semaine",
  month: "par mois",
};

export function describeGranularity(granularity: Granularity): string {
  return granularityLabels[granularity];
}

/**
 * Découpe [start, end] en tranches continues (jours, semaines ou mois selon la durée),
 * tranches vides incluses, en heure de Paris.
 */
export function createTimeline(start: Date, end: Date): Timeline {
  const endDayUtc = parisDayUtc(end);
  const startDayUtc = Math.min(parisDayUtc(start), endDayUtc);
  const granularity = pickGranularity(startDayUtc, endDayUtc);

  const buckets: TimelineBucket[] = [];
  const knownKeys = new Set<string>();
  const lastBucketUtc = bucketStartUtc(endDayUtc, granularity);
  for (
    let bucketUtc = bucketStartUtc(startDayUtc, granularity);
    bucketUtc <= lastBucketUtc;
    bucketUtc = nextBucketStartUtc(bucketUtc, granularity)
  ) {
    const key = new Date(bucketUtc).toISOString().slice(0, 10);
    knownKeys.add(key);
    buckets.push({ key, label: bucketLabel(bucketUtc, granularity) });
  }

  return {
    granularity,
    buckets,
    keyOf(date) {
      const key = new Date(bucketStartUtc(parisDayUtc(date), granularity))
        .toISOString()
        .slice(0, 10);
      return knownKeys.has(key) ? key : null;
    },
  };
}

/** Début de la frise : le début de la période, ou la donnée la plus ancienne pour « depuis le début ». */
export function resolveTimelineStart(range: StatisticsRange, earliest: Date | null): Date {
  return range.since ?? earliest ?? range.now;
}

export function earliestDate(dates: (Date | null | undefined)[]): Date | null {
  let earliest: Date | null = null;
  for (const date of dates) {
    if (date && (!earliest || date < earliest)) {
      earliest = date;
    }
  }
  return earliest;
}

/** Compte des dates par tranche, dans l'ordre de la frise. */
export function countByBucket(timeline: Timeline, dates: Date[]): number[] {
  const counts = new Map<string, number>(timeline.buckets.map((bucket) => [bucket.key, 0]));
  for (const date of dates) {
    const key = timeline.keyOf(date);
    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return timeline.buckets.map((bucket) => counts.get(bucket.key) ?? 0);
}

export function sinceFilter(range: StatisticsRange): { gte: Date } | undefined {
  return range.since ? { gte: range.since } : undefined;
}
