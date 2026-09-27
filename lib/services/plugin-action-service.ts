import "server-only";

import { prisma } from "@/lib/prisma";
import { PluginActionType, SanctionType } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Actions older than this are considered stale and are no longer delivered to the plugin. */
const ACTION_TTL_MS = 24 * 60 * 60 * 1000;

export interface KickActionPayload {
  /** Kick cause; the plugin maps it to a player-facing message from its own message file. */
  cause: "WHITELIST_REVOKED";
  /** When true, the plugin skips the kick if the player is in its local whitelist. */
  unlessLocalWhitelist: boolean;
}

export interface SanctionActionPayload {
  sanctionId: string;
  sanctionType: SanctionType;
  reason: string;
  expiresAt: string | null;
}

type ActionPayloadByType = {
  [PluginActionType.KICK]: KickActionPayload;
  [PluginActionType.SANCTION]: SanctionActionPayload;
};

export async function enqueuePluginAction<T extends PluginActionType>(
  type: T,
  targetUuid: string,
  payload: ActionPayloadByType[T],
  tx: Prisma.TransactionClient = prisma
) {
  return tx.pluginAction.create({
    data: { type, targetUuid, payload: payload as unknown as Prisma.InputJsonValue },
  });
}

export async function listPendingPluginActions(limit = 100) {
  return prisma.pluginAction.findMany({
    where: {
      acknowledgedAt: null,
      createdAt: { gte: new Date(Date.now() - ACTION_TTL_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function acknowledgePluginActions(ids: string[]) {
  if (ids.length === 0) return 0;
  const result = await prisma.pluginAction.updateMany({
    where: { id: { in: ids }, acknowledgedAt: null },
    data: { acknowledgedAt: new Date() },
  });
  return result.count;
}
