import "server-only";

import { prisma } from "@/lib/prisma";
import { getParisParts } from "@/lib/date";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { mean } from "@/lib/text-stats";
import {
  DAY_MS,
  HOUR_MS,
  createTimeline,
  earliestDate,
  parisDayUtc,
  resolveTimelineStart,
  type Granularity,
  type StatisticsRange,
} from "@/lib/services/statistics/timeline";

const TOP_PLAYERS_COUNT = 10;
const ACTIVE_WINDOW_DAYS = 7;
const INACTIVE_THRESHOLD_DAYS = 14;

export interface TopPlayer {
  key: string;
  userId: string | null;
  name: string;
  minecraftUsername: string;
  hours: number;
  sessions: number;
}

export interface GameActivityStats {
  hasData: boolean;
  totals: {
    hoursPlayed: number;
    uniquePlayers: number;
    sessions: number;
    meanSessionMs: number | null;
    peakConcurrent: number;
    peakAt: Date | null;
  };
  granularity: Granularity;
  timeline: { label: string; hours: number; players: number }[];
  /** Joueurs connectés en moyenne, par jour de semaine (0 = lundi) puis par heure de Paris. */
  heatmap: number[][];
  topPlayers: TopPlayer[];
  attendance: {
    whitelisted: number;
    activeRecently: number;
    /** Vus récemment, mais pas dans la fenêtre d'activité. */
    occasional: number;
    inactive: number;
    neverConnected: number;
    activeWindowDays: number;
    inactiveThresholdDays: number;
  };
}

interface HourSlot {
  bucketKey: string | null;
  weekday: number;
  hour: number;
}

export async function getGameActivityStats(range: StatisticsRange): Promise<GameActivityStats> {
  const [sessions, whitelistedPlayers, lastConnections] = await Promise.all([
    prisma.gameSession.findMany({
      where: range.since ? { disconnectedAt: { gte: range.since } } : undefined,
      select: {
        userId: true,
        minecraftUuid: true,
        minecraftUsername: true,
        connectedAt: true,
        disconnectedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { registrationStatus: RegistrationStatus.WHITELISTED },
      select: { id: true, minecraftUsername: true, discordDisplayName: true },
    }),
    prisma.gameSession.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      _max: { connectedAt: true },
    }),
  ]);

  const timelineStart = resolveTimelineStart(
    range,
    earliestDate(sessions.map((session) => session.connectedAt))
  );
  const timeline = createTimeline(timelineStart, range.now);
  const hoursByBucket = new Map<string, number>();
  const playersByBucket = new Map<string, Set<string>>();
  const playerHours = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));

  // Paris est toujours décalé d'un nombre entier d'heures : chaque heure UTC correspond à une
  // seule heure de Paris, ce qui permet de ne résoudre le fuseau qu'une fois par heure.
  const hourSlots = new Map<number, HourSlot>();
  const resolveHourSlot = (timestamp: number): HourSlot => {
    const hourIndex = Math.floor(timestamp / HOUR_MS);
    let slot = hourSlots.get(hourIndex);
    if (!slot) {
      const date = new Date(hourIndex * HOUR_MS);
      slot = {
        bucketKey: timeline.keyOf(date),
        weekday: (new Date(parisDayUtc(date)).getUTCDay() + 6) % 7,
        hour: getParisParts(date).hour,
      };
      hourSlots.set(hourIndex, slot);
    }
    return slot;
  };

  const rangeStartMs = range.since?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rangeEndMs = range.now.getTime();
  const durations: number[] = [];
  const uniquePlayers = new Set<string>();
  const concurrencyEvents: { at: number; delta: number }[] = [];
  const perPlayer = new Map<string, TopPlayer & { lastSeenMs: number }>();
  let totalMs = 0;
  let countedSessions = 0;

  for (const session of sessions) {
    const startMs = Math.max(session.connectedAt.getTime(), rangeStartMs);
    const endMs = Math.min(session.disconnectedAt.getTime(), rangeEndMs);
    if (endMs <= startMs) continue;

    countedSessions += 1;
    totalMs += endMs - startMs;
    durations.push(session.disconnectedAt.getTime() - session.connectedAt.getTime());
    uniquePlayers.add(session.minecraftUuid);
    concurrencyEvents.push({ at: startMs, delta: 1 }, { at: endMs, delta: -1 });

    const playerKey = session.userId ?? session.minecraftUuid;
    const player = perPlayer.get(playerKey) ?? {
      key: playerKey,
      userId: session.userId,
      name: session.minecraftUsername,
      minecraftUsername: session.minecraftUsername,
      hours: 0,
      sessions: 0,
      lastSeenMs: 0,
    };
    player.hours += (endMs - startMs) / HOUR_MS;
    player.sessions += 1;
    if (session.connectedAt.getTime() > player.lastSeenMs) {
      // Le pseudo affiché est celui de la session la plus récente.
      player.lastSeenMs = session.connectedAt.getTime();
      player.name = session.minecraftUsername;
      player.minecraftUsername = session.minecraftUsername;
    }
    perPlayer.set(playerKey, player);

    for (let cursor = startMs; cursor < endMs;) {
      const segmentEnd = Math.min((Math.floor(cursor / HOUR_MS) + 1) * HOUR_MS, endMs);
      const hours = (segmentEnd - cursor) / HOUR_MS;
      const slot = resolveHourSlot(cursor);
      playerHours[slot.weekday][slot.hour] += hours;
      if (slot.bucketKey) {
        hoursByBucket.set(slot.bucketKey, (hoursByBucket.get(slot.bucketKey) ?? 0) + hours);
        const players = playersByBucket.get(slot.bucketKey) ?? new Set<string>();
        players.add(session.minecraftUuid);
        playersByBucket.set(slot.bucketKey, players);
      }
      cursor = segmentEnd;
    }
  }

  // Pic de joueurs simultanés : balayage des connexions/déconnexions, déconnexions d'abord.
  concurrencyEvents.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let concurrent = 0;
  let peakConcurrent = 0;
  let peakAtMs: number | null = null;
  for (const event of concurrencyEvents) {
    concurrent += event.delta;
    if (concurrent > peakConcurrent) {
      peakConcurrent = concurrent;
      peakAtMs = event.at;
    }
  }

  // Moyenne par créneau : heures-joueur cumulées rapportées au nombre de fois où ce jour de
  // semaine apparaît dans la période.
  const weekdayOccurrences = new Array<number>(7).fill(0);
  const lastDayUtc = parisDayUtc(range.now);
  for (let dayUtc = parisDayUtc(timelineStart); dayUtc <= lastDayUtc; dayUtc += DAY_MS) {
    weekdayOccurrences[(new Date(dayUtc).getUTCDay() + 6) % 7] += 1;
  }
  const heatmap = playerHours.map((hoursOfDay, weekday) =>
    hoursOfDay.map((hours) =>
      weekdayOccurrences[weekday] > 0 ? hours / weekdayOccurrences[weekday] : 0
    )
  );

  const lastConnectedByUser = new Map<string, Date>();
  for (const entry of lastConnections) {
    if (entry.userId && entry._max.connectedAt) {
      lastConnectedByUser.set(entry.userId, entry._max.connectedAt);
    }
  }
  const activeThreshold = rangeEndMs - ACTIVE_WINDOW_DAYS * DAY_MS;
  const inactiveThreshold = rangeEndMs - INACTIVE_THRESHOLD_DAYS * DAY_MS;
  let activeRecently = 0;
  let occasional = 0;
  let inactive = 0;
  let neverConnected = 0;
  for (const player of whitelistedPlayers) {
    const lastConnectedAt = lastConnectedByUser.get(player.id);
    if (!lastConnectedAt) {
      neverConnected += 1;
    } else if (lastConnectedAt.getTime() >= activeThreshold) {
      activeRecently += 1;
    } else if (lastConnectedAt.getTime() < inactiveThreshold) {
      inactive += 1;
    } else {
      occasional += 1;
    }
  }

  const topPlayers = [...perPlayer.values()]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, TOP_PLAYERS_COUNT)
    .map((player) => ({
      key: player.key,
      userId: player.userId,
      name: player.name,
      minecraftUsername: player.minecraftUsername,
      hours: player.hours,
      sessions: player.sessions,
    }));

  return {
    hasData: countedSessions > 0,
    totals: {
      hoursPlayed: totalMs / HOUR_MS,
      uniquePlayers: uniquePlayers.size,
      sessions: countedSessions,
      meanSessionMs: mean(durations),
      peakConcurrent,
      peakAt: peakAtMs === null ? null : new Date(peakAtMs),
    },
    granularity: timeline.granularity,
    timeline: timeline.buckets.map((bucket) => ({
      label: bucket.label,
      hours: Math.round((hoursByBucket.get(bucket.key) ?? 0) * 10) / 10,
      players: playersByBucket.get(bucket.key)?.size ?? 0,
    })),
    heatmap,
    topPlayers,
    attendance: {
      whitelisted: whitelistedPlayers.length,
      activeRecently,
      occasional,
      inactive,
      neverConnected,
      activeWindowDays: ACTIVE_WINDOW_DAYS,
      inactiveThresholdDays: INACTIVE_THRESHOLD_DAYS,
    },
  };
}
