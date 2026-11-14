import "server-only";

import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";
import type { RetentionAlertStatus } from "@/lib/atlas-status";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface RetentionPlayerItem {
  id: string;
  minecraftUuid: string | null;
  minecraftUsername: string | null;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  status: RetentionAlertStatus;
  recentHours: number;
  previousHours: number;
  dropPercentage: number | null;
  totalHours: number;
  lastConnectedAt: Date | null;
  daysSinceLastSeen: number | null;
  whitelistedAt: Date;
}

export interface RetentionStats {
  counts: {
    totalWhitelisted: number;
    ghostCount: number;
    severeDropCount: number;
    abnormalAbsenceCount: number;
    confirmedInactiveCount: number;
    healthyCount: number;
    totalAtRisk: number;
  };
  thresholds: {
    ghostDays: number;
    establishedHours: number;
    dropPercentage: number;
    absenceDays: number;
    inactiveDays: number;
  };
  players: RetentionPlayerItem[];
}

export async function getRetentionStats(): Promise<RetentionStats> {
  const now = new Date();
  const nowMs = now.getTime();
  const recentCutoff = new Date(nowMs - 7 * DAY_MS);
  const previousCutoff = new Date(nowMs - 14 * DAY_MS);

  const [settings, whitelistedUsers, sessions, whitelistHistories] = await Promise.all([
    getGlobalSettings(),
    prisma.user.findMany({
      where: { registrationStatus: RegistrationStatus.WHITELISTED },
      select: {
        id: true,
        minecraftUuid: true,
        minecraftUsername: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
        createdAt: true,
      },
    }),
    prisma.gameSession.findMany({
      where: {
        userId: { not: null },
      },
      select: {
        userId: true,
        connectedAt: true,
        disconnectedAt: true,
      },
    }),
    prisma.registrationStatusHistory.findMany({
      where: { status: RegistrationStatus.WHITELISTED },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  const thresholds = {
    ghostDays: settings.retentionGhostDays ?? 7,
    establishedHours: settings.retentionEstablishedHours ?? 10,
    dropPercentage: settings.retentionDropPercentage ?? 50,
    absenceDays: settings.retentionAbsenceDays ?? 7,
    inactiveDays: settings.retentionInactiveDays ?? 14,
  };

  // Map des dates de whitelist
  const whitelistedAtByUser = new Map<string, Date>();
  for (const h of whitelistHistories) {
    if (!whitelistedAtByUser.has(h.userId)) {
      whitelistedAtByUser.set(h.userId, h.createdAt);
    }
  }

  // Agrégation des sessions par utilisateur
  interface UserSessionAggregate {
    totalMs: number;
    recentMs: number;
    previousMs: number;
    lastSeenMs: number;
  }
  const userAggregates = new Map<string, UserSessionAggregate>();

  for (const session of sessions) {
    if (!session.userId) continue;
    const agg = userAggregates.get(session.userId) ?? {
      totalMs: 0,
      recentMs: 0,
      previousMs: 0,
      lastSeenMs: 0,
    };

    const startMs = session.connectedAt.getTime();
    const endMs = session.disconnectedAt.getTime();
    const duration = Math.max(0, endMs - startMs);

    agg.totalMs += duration;
    if (endMs > agg.lastSeenMs) {
      agg.lastSeenMs = endMs;
    }

    // Heures récentes (derniers 7 jours)
    const recentStart = Math.max(startMs, recentCutoff.getTime());
    const recentEnd = Math.min(endMs, nowMs);
    if (recentEnd > recentStart) {
      agg.recentMs += recentEnd - recentStart;
    }

    // Heures précédentes (J-14 à J-7)
    const prevStart = Math.max(startMs, previousCutoff.getTime());
    const prevEnd = Math.min(endMs, recentCutoff.getTime());
    if (prevEnd > prevStart) {
      agg.previousMs += prevEnd - prevStart;
    }

    userAggregates.set(session.userId, agg);
  }

  let ghostCount = 0;
  let severeDropCount = 0;
  let abnormalAbsenceCount = 0;
  let confirmedInactiveCount = 0;
  let healthyCount = 0;

  const atRiskPlayers: RetentionPlayerItem[] = [];

  for (const user of whitelistedUsers) {
    const agg = userAggregates.get(user.id);
    const whitelistedAt = whitelistedAtByUser.get(user.id) ?? user.createdAt;
    const daysSinceWhitelisted = (nowMs - whitelistedAt.getTime()) / DAY_MS;

    const totalHours = agg ? agg.totalMs / HOUR_MS : 0;
    const recentHours = agg ? agg.recentMs / HOUR_MS : 0;
    const previousHours = agg ? agg.previousMs / HOUR_MS : 0;
    const lastConnectedAt = agg && agg.lastSeenMs > 0 ? new Date(agg.lastSeenMs) : null;
    const daysSinceLastSeen = lastConnectedAt
      ? Math.floor((nowMs - lastConnectedAt.getTime()) / DAY_MS)
      : null;

    let dropPercentage: number | null = null;
    if (previousHours > 0) {
      dropPercentage = Math.round(((previousHours - recentHours) / previousHours) * 100);
    }

    let status: RetentionAlertStatus = "HEALTHY";

    if (!lastConnectedAt || totalHours < 0.25) {
      // Jamais connecté ou moins de 15 minutes
      if (daysSinceWhitelisted >= thresholds.ghostDays) {
        status = "GHOST";
      } else {
        status = "HEALTHY";
      }
    } else {
      if (daysSinceLastSeen !== null && daysSinceLastSeen >= thresholds.inactiveDays) {
        status = "CONFIRMED_INACTIVE";
      } else if (totalHours >= thresholds.establishedHours) {
        if (daysSinceLastSeen !== null && daysSinceLastSeen >= thresholds.absenceDays) {
          status = "ABNORMAL_ABSENCE";
        } else if (dropPercentage !== null && dropPercentage >= thresholds.dropPercentage) {
          status = "SEVERE_DROP";
        } else {
          status = "HEALTHY";
        }
      } else {
        status = "HEALTHY";
      }
    }

    switch (status) {
      case "GHOST":
        ghostCount += 1;
        break;
      case "SEVERE_DROP":
        severeDropCount += 1;
        break;
      case "ABNORMAL_ABSENCE":
        abnormalAbsenceCount += 1;
        break;
      case "CONFIRMED_INACTIVE":
        confirmedInactiveCount += 1;
        break;
      case "HEALTHY":
        healthyCount += 1;
        break;
    }

    if (status !== "HEALTHY") {
      atRiskPlayers.push({
        id: user.id,
        minecraftUuid: user.minecraftUuid,
        minecraftUsername: user.minecraftUsername,
        discordUsername: user.discordUsername,
        discordDisplayName: user.discordDisplayName,
        discordAvatarUrl: user.discordAvatarUrl,
        status,
        recentHours: Math.round(recentHours * 10) / 10,
        previousHours: Math.round(previousHours * 10) / 10,
        dropPercentage,
        totalHours: Math.round(totalHours * 10) / 10,
        lastConnectedAt,
        daysSinceLastSeen,
        whitelistedAt,
      });
    }
  }

  // Tri par criticité par défaut
  const severityRank: Record<RetentionAlertStatus, number> = {
    SEVERE_DROP: 1,
    ABNORMAL_ABSENCE: 2,
    GHOST: 3,
    CONFIRMED_INACTIVE: 4,
    HEALTHY: 5,
  };

  atRiskPlayers.sort((a, b) => {
    const rankDiff = severityRank[a.status] - severityRank[b.status];
    if (rankDiff !== 0) return rankDiff;
    return (b.daysSinceLastSeen ?? 999) - (a.daysSinceLastSeen ?? 999);
  });

  return {
    counts: {
      totalWhitelisted: whitelistedUsers.length,
      ghostCount,
      severeDropCount,
      abnormalAbsenceCount,
      confirmedInactiveCount,
      healthyCount,
      totalAtRisk: atRiskPlayers.length,
    },
    thresholds,
    players: atRiskPlayers,
  };
}

/**
 * Calcule le statut de rétention pour un joueur individuel.
 */
export async function getPlayerRetentionStatus(userId: string): Promise<RetentionAlertStatus> {
  const [settings, user, sessions, whitelistHistory] = await Promise.all([
    getGlobalSettings(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { registrationStatus: true, createdAt: true },
    }),
    prisma.gameSession.findMany({
      where: { userId },
      select: { connectedAt: true, disconnectedAt: true },
    }),
    prisma.registrationStatusHistory.findFirst({
      where: { userId, status: RegistrationStatus.WHITELISTED },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!user || user.registrationStatus !== RegistrationStatus.WHITELISTED) {
    return "HEALTHY";
  }

  const now = new Date();
  const nowMs = now.getTime();
  const recentCutoffMs = nowMs - 7 * DAY_MS;
  const previousCutoffMs = nowMs - 14 * DAY_MS;

  const thresholds = {
    ghostDays: settings.retentionGhostDays ?? 7,
    establishedHours: settings.retentionEstablishedHours ?? 10,
    dropPercentage: settings.retentionDropPercentage ?? 50,
    absenceDays: settings.retentionAbsenceDays ?? 7,
    inactiveDays: settings.retentionInactiveDays ?? 14,
  };

  const whitelistedAt = whitelistHistory?.createdAt ?? user.createdAt;
  const daysSinceWhitelisted = (nowMs - whitelistedAt.getTime()) / DAY_MS;

  let totalMs = 0;
  let recentMs = 0;
  let previousMs = 0;
  let lastSeenMs = 0;

  for (const session of sessions) {
    const startMs = session.connectedAt.getTime();
    const endMs = session.disconnectedAt.getTime();
    const duration = Math.max(0, endMs - startMs);

    totalMs += duration;
    if (endMs > lastSeenMs) lastSeenMs = endMs;

    const recentStart = Math.max(startMs, recentCutoffMs);
    const recentEnd = Math.min(endMs, nowMs);
    if (recentEnd > recentStart) recentMs += recentEnd - recentStart;

    const prevStart = Math.max(startMs, previousCutoffMs);
    const prevEnd = Math.min(endMs, recentCutoffMs);
    if (prevEnd > prevStart) previousMs += prevEnd - prevStart;
  }

  const totalHours = totalMs / HOUR_MS;
  const recentHours = recentMs / HOUR_MS;
  const previousHours = previousMs / HOUR_MS;
  const daysSinceLastSeen = lastSeenMs > 0 ? Math.floor((nowMs - lastSeenMs) / DAY_MS) : null;

  if (lastSeenMs === 0 || totalHours < 0.25) {
    if (daysSinceWhitelisted >= thresholds.ghostDays) {
      return "GHOST";
    }
    return "HEALTHY";
  }

  if (daysSinceLastSeen !== null && daysSinceLastSeen >= thresholds.inactiveDays) {
    return "CONFIRMED_INACTIVE";
  }

  if (totalHours >= thresholds.establishedHours) {
    if (daysSinceLastSeen !== null && daysSinceLastSeen >= thresholds.absenceDays) {
      return "ABNORMAL_ABSENCE";
    }
    if (previousHours > 0) {
      const drop = ((previousHours - recentHours) / previousHours) * 100;
      if (drop >= thresholds.dropPercentage) {
        return "SEVERE_DROP";
      }
    }
  }

  return "HEALTHY";
}
