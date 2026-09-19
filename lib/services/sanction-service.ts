import "server-only";

import { prisma } from "@/lib/prisma";
import { PluginActionType, Role, SanctionSource, SanctionType } from "@/lib/generated/prisma/enums";
import { enqueuePluginAction } from "@/lib/services/plugin-action-service";

export const SANCTION_REASON_MAX_LENGTH = 500;
/** Upper bound for a suspension: anything longer should be an exclusion. */
export const SUSPENSION_MAX_DURATION_MS = 5 * 365 * 24 * 60 * 60 * 1000;

const CONSOLE_NAME = "Console";

export type SanctionErrorCode =
  | "INVALID_REASON"
  | "INVALID_DURATION"
  | "TARGET_NOT_FOUND"
  | "TARGET_IS_STAFF"
  | "ISSUER_NOT_STAFF"
  | "ALREADY_EXCLUDED"
  | "NO_ACTIVE_SANCTION"
  | "SANCTION_NOT_FOUND";

const ERROR_MESSAGES: Record<SanctionErrorCode, string> = {
  INVALID_REASON: "Raison invalide (500 caractères max).",
  INVALID_DURATION: "Durée invalide.",
  TARGET_NOT_FOUND: "Joueur introuvable sur le service.",
  TARGET_IS_STAFF: "Impossible de sanctionner un membre du staff.",
  ISSUER_NOT_STAFF: "Action réservée au staff.",
  ALREADY_EXCLUDED: "Ce joueur est déjà exclu.",
  NO_ACTIVE_SANCTION: "Aucune sanction active pour ce joueur.",
  SANCTION_NOT_FOUND: "Sanction introuvable.",
};

export class SanctionError extends Error {
  constructor(public readonly code: SanctionErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "SanctionError";
  }
}

/** Who performs a sanction operation: a web staff user, a Minecraft player (by UUID) or the console. */
export type SanctionActor =
  { kind: "user"; userId: string } | { kind: "minecraft"; uuid: string } | { kind: "console" };

interface ResolvedActor {
  id: string | null;
  name: string;
}

async function resolveStaffActor(actor: SanctionActor): Promise<ResolvedActor> {
  if (actor.kind === "console") {
    return { id: null, name: CONSOLE_NAME };
  }

  const user = await prisma.user.findUnique({
    where: actor.kind === "user" ? { id: actor.userId } : { minecraftUuid: actor.uuid },
    select: { id: true, role: true, minecraftUsername: true, discordDisplayName: true },
  });

  if (!user || user.role === Role.PLAYER) {
    throw new SanctionError("ISSUER_NOT_STAFF");
  }

  return { id: user.id, name: user.minecraftUsername ?? user.discordDisplayName };
}

function isBanType(type: SanctionType) {
  return type === SanctionType.SUSPENSION || type === SanctionType.EXCLUSION;
}

function activeBanWhere(userId: string, now = new Date()) {
  return {
    userId,
    revokedAt: null,
    type: { in: [SanctionType.SUSPENSION, SanctionType.EXCLUSION] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Returns the ban currently preventing the player from joining, if any.
 * An exclusion always wins over a suspension; otherwise the suspension ending last is returned.
 */
export async function getActiveBan(userId: string) {
  const bans = await prisma.sanction.findMany({ where: activeBanWhere(userId) });
  if (bans.length === 0) return null;

  return bans.reduce((best, ban) => {
    if (!best.expiresAt) return best;
    if (!ban.expiresAt) return ban;
    return ban.expiresAt > best.expiresAt ? ban : best;
  });
}

export async function listSanctions(userId: string, limit?: number) {
  return prisma.sanction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

export interface CreateSanctionInput {
  targetUserId: string;
  type: SanctionType;
  reason: string;
  /** Required for a suspension, ignored otherwise. */
  durationMs?: number;
  issuer: SanctionActor;
  source: SanctionSource;
}

/**
 * Single entry point for creating a sanction, from the web dashboard or from the game.
 * Permissions are always re-checked here, whatever the caller already verified.
 */
export async function createSanction(input: CreateSanctionInput) {
  const reason = input.reason.trim();
  if (!reason || reason.length > SANCTION_REASON_MAX_LENGTH) {
    throw new SanctionError("INVALID_REASON");
  }

  let expiresAt: Date | null = null;
  if (input.type === SanctionType.SUSPENSION) {
    const duration = input.durationMs;
    if (
      duration === undefined ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > SUSPENSION_MAX_DURATION_MS
    ) {
      throw new SanctionError("INVALID_DURATION");
    }
    expiresAt = new Date(Date.now() + duration);
  }

  const target = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, role: true, minecraftUuid: true },
  });
  if (!target) throw new SanctionError("TARGET_NOT_FOUND");
  if (target.role !== Role.PLAYER) throw new SanctionError("TARGET_IS_STAFF");

  const issuer = await resolveStaffActor(input.issuer);

  return prisma.$transaction(async (tx) => {
    if (isBanType(input.type)) {
      const activeBans = await tx.sanction.findMany({ where: activeBanWhere(target.id) });
      if (activeBans.some((ban) => ban.type === SanctionType.EXCLUSION)) {
        throw new SanctionError("ALREADY_EXCLUDED");
      }
      // A new ban replaces any running suspension so only one ban is active at a time.
      if (activeBans.length > 0) {
        await tx.sanction.updateMany({
          where: { id: { in: activeBans.map((ban) => ban.id) } },
          data: { revokedAt: new Date(), revokedById: issuer.id, revokedByName: issuer.name },
        });
      }
    }

    const sanction = await tx.sanction.create({
      data: {
        userId: target.id,
        type: input.type,
        reason,
        expiresAt,
        source: input.source,
        issuedById: issuer.id,
        issuedByName: issuer.name,
      },
    });

    // Sanctions issued in game are already applied locally by the plugin.
    if (input.source === SanctionSource.WEB && target.minecraftUuid) {
      await enqueuePluginAction(
        PluginActionType.SANCTION,
        target.minecraftUuid,
        {
          sanctionId: sanction.id,
          sanctionType: sanction.type,
          reason: sanction.reason,
          expiresAt: sanction.expiresAt?.toISOString() ?? null,
        },
        tx
      );
    }

    return sanction;
  });
}

async function markRevoked(ids: string[], revoker: ResolvedActor) {
  await prisma.sanction.updateMany({
    where: { id: { in: ids }, revokedAt: null },
    data: { revokedAt: new Date(), revokedById: revoker.id, revokedByName: revoker.name },
  });
}

/** Lifts every active suspension or exclusion of the player. */
export async function revokeActiveBans(targetUserId: string, revokerActor: SanctionActor) {
  const revoker = await resolveStaffActor(revokerActor);
  const bans = await prisma.sanction.findMany({ where: activeBanWhere(targetUserId) });
  if (bans.length === 0) throw new SanctionError("NO_ACTIVE_SANCTION");

  await markRevoked(
    bans.map((ban) => ban.id),
    revoker
  );
  return bans;
}

/** Lifts the given warning, or the most recent active warning when no ID is given. */
export async function revokeWarning(
  targetUserId: string,
  revokerActor: SanctionActor,
  sanctionId?: string
) {
  const revoker = await resolveStaffActor(revokerActor);
  const warning = await prisma.sanction.findFirst({
    where: {
      userId: targetUserId,
      type: SanctionType.WARNING,
      revokedAt: null,
      ...(sanctionId ? { id: sanctionId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!warning) throw new SanctionError("NO_ACTIVE_SANCTION");

  await markRevoked([warning.id], revoker);
  return warning;
}

/** Lifts one sanction of the given player by ID (used from the web dashboard). */
export async function revokeSanctionById(
  targetUserId: string,
  sanctionId: string,
  revokerActor: SanctionActor
) {
  const revoker = await resolveStaffActor(revokerActor);
  const sanction = await prisma.sanction.findUnique({ where: { id: sanctionId } });
  if (!sanction || sanction.userId !== targetUserId) throw new SanctionError("SANCTION_NOT_FOUND");
  if (sanction.revokedAt) throw new SanctionError("NO_ACTIVE_SANCTION");

  await markRevoked([sanction.id], revoker);
  return sanction;
}
