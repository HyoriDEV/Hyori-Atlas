import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CharacterStatus,
  ConversationType,
  MessageAuthorType,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { RP_TRACKING_ACTIVE_DAYS, type RpTrackingState } from "@/lib/rp-tracking";
import { countWords, mean } from "@/lib/text-stats";

const ACTIVE_WINDOW_MS = RP_TRACKING_ACTIVE_DAYS * 24 * 60 * 60 * 1000;

// Les messages système (ex. « a créé une demande RP ») et supprimés ne comptent jamais
// comme un échange : ils ne doivent ni réveiller un suivi ni valoir réponse du staff.
const EXCHANGE_MESSAGE_WHERE = {
  conversation: { type: ConversationType.RP_TRACKING },
  deletedAt: null,
  authorType: { not: MessageAuthorType.SYSTEM },
} satisfies Prisma.ConversationMessageWhereInput;

export interface RpTrackingPlayerState {
  playerId: string;
  playerName: string;
  minecraftUsername: string | null;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  conversationId: string | null;
  state: RpTrackingState;
  messageCount: number;
  lastStaffMessageAt: Date | null;
  lastActivityAt: Date | null;
  /** Premier message du joueur resté sans réponse (état « pending » uniquement). */
  waitingSince: Date | null;
}

export interface RpTrackingStates {
  players: RpTrackingPlayerState[];
  counts: Record<RpTrackingState, number>;
}

const STATE_ORDER: Record<RpTrackingState, number> = {
  pending: 0,
  recent: 1,
  dormant: 2,
  none: 3,
};

function compareRpTrackingPlayers(a: RpTrackingPlayerState, b: RpTrackingPlayerState): number {
  if (a.state !== b.state) {
    return STATE_ORDER[a.state] - STATE_ORDER[b.state];
  }
  if (a.state === "pending") {
    // L'attente la plus ancienne d'abord.
    const diff = (a.waitingSince?.getTime() ?? 0) - (b.waitingSince?.getTime() ?? 0);
    if (diff !== 0) return diff;
  } else if (a.state !== "none") {
    const diff = (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    if (diff !== 0) return diff;
  }
  return a.playerName.localeCompare(b.playerName, "fr", { sensitivity: "base" });
}

/**
 * État du suivi RP de chaque joueur whitelisté, trié : à traiter (attente la plus ancienne
 * d'abord), actifs, en sommeil, puis sans échange.
 */
export async function getRpTrackingStates(): Promise<RpTrackingStates> {
  const [players, messageStats] = await Promise.all([
    prisma.user.findMany({
      where: { registrationStatus: RegistrationStatus.WHITELISTED },
      select: {
        id: true,
        minecraftUsername: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
        conversationMemberships: {
          where: { conversation: { type: ConversationType.RP_TRACKING } },
          orderBy: { joinedAt: "asc" },
          take: 1,
          select: { conversationId: true },
        },
      },
    }),
    prisma.conversationMessage.groupBy({
      by: ["conversationId", "authorType"],
      where: EXCHANGE_MESSAGE_WHERE,
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const statsByConversation = new Map<
    string,
    { messageCount: number; lastPlayerAt: Date | null; lastStaffAt: Date | null }
  >();
  for (const entry of messageStats) {
    const stats = statsByConversation.get(entry.conversationId) ?? {
      messageCount: 0,
      lastPlayerAt: null,
      lastStaffAt: null,
    };
    stats.messageCount += entry._count._all;
    if (entry.authorType === MessageAuthorType.PLAYER) {
      stats.lastPlayerAt = entry._max.createdAt;
    } else {
      stats.lastStaffAt = entry._max.createdAt;
    }
    statsByConversation.set(entry.conversationId, stats);
  }

  const now = Date.now();
  const states: RpTrackingPlayerState[] = players.map((player) => {
    const conversationId = player.conversationMemberships[0]?.conversationId ?? null;
    const stats = conversationId ? statsByConversation.get(conversationId) : undefined;
    const lastPlayerAt = stats?.lastPlayerAt ?? null;
    const lastStaffAt = stats?.lastStaffAt ?? null;
    const lastActivityAt =
      lastPlayerAt && lastStaffAt
        ? lastPlayerAt > lastStaffAt
          ? lastPlayerAt
          : lastStaffAt
        : (lastPlayerAt ?? lastStaffAt);

    let state: RpTrackingState;
    if (!lastActivityAt) {
      state = "none";
    } else if (lastPlayerAt && (!lastStaffAt || lastPlayerAt > lastStaffAt)) {
      state = "pending";
    } else {
      state = now - lastActivityAt.getTime() < ACTIVE_WINDOW_MS ? "recent" : "dormant";
    }

    return {
      playerId: player.id,
      playerName: player.minecraftUsername ?? player.discordDisplayName,
      minecraftUsername: player.minecraftUsername,
      discordUsername: player.discordUsername,
      discordDisplayName: player.discordDisplayName,
      discordAvatarUrl: player.discordAvatarUrl,
      conversationId,
      state,
      messageCount: stats?.messageCount ?? 0,
      lastStaffMessageAt: lastStaffAt,
      lastActivityAt,
      waitingSince: null,
    };
  });

  const pending = states.filter((entry) => entry.state === "pending" && entry.conversationId);
  if (pending.length > 0) {
    const unanswered = await prisma.conversationMessage.findMany({
      where: {
        deletedAt: null,
        authorType: MessageAuthorType.PLAYER,
        OR: pending.map((entry) => ({
          conversationId: entry.conversationId!,
          ...(entry.lastStaffMessageAt ? { createdAt: { gt: entry.lastStaffMessageAt } } : {}),
        })),
      },
      orderBy: { createdAt: "asc" },
      select: { conversationId: true, createdAt: true },
    });
    const firstUnanswered = new Map<string, Date>();
    for (const message of unanswered) {
      if (!firstUnanswered.has(message.conversationId)) {
        firstUnanswered.set(message.conversationId, message.createdAt);
      }
    }
    for (const entry of pending) {
      entry.waitingSince = firstUnanswered.get(entry.conversationId!) ?? entry.lastActivityAt;
    }
  }

  states.sort(compareRpTrackingPlayers);

  const counts: Record<RpTrackingState, number> = { pending: 0, recent: 0, dormant: 0, none: 0 };
  for (const entry of states) {
    counts[entry.state] += 1;
  }

  return { players: states, counts };
}

export interface RpTrackingPlayerContext {
  character: { id: string; name: string; className: string | null } | null;
  writing: { chapterCount: number; wordCount: number; lastUpdatedAt: Date | null };
  lastConnectedAt: Date | null;
}

/** Personnage actif, trame de ce personnage et dernière connexion en jeu, par joueur. */
export async function getRpTrackingPlayerContexts(
  playerIds: string[]
): Promise<Map<string, RpTrackingPlayerContext>> {
  const contexts = new Map<string, RpTrackingPlayerContext>();
  if (playerIds.length === 0) {
    return contexts;
  }

  const [sheets, lastSessions] = await Promise.all([
    prisma.characterSheet.findMany({
      where: { playerId: { in: playerIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        playerId: true,
        name: true,
        status: true,
        overrideClassId: true,
        overrideClass: { select: { name: true } },
        primaryClass: { select: { name: true } },
      },
    }),
    prisma.gameSession.groupBy({
      by: ["userId"],
      where: { userId: { in: playerIds } },
      _max: { connectedAt: true },
    }),
  ]);

  // Même règle que le lecteur de trame staff : personnage actif, sinon le plus récent.
  const sheetByPlayer = new Map<string, (typeof sheets)[number]>();
  for (const sheet of sheets) {
    const current = sheetByPlayer.get(sheet.playerId);
    if (
      !current ||
      (current.status !== CharacterStatus.ACTIVE && sheet.status === CharacterStatus.ACTIVE)
    ) {
      sheetByPlayer.set(sheet.playerId, sheet);
    }
  }

  const sheetIds = [...sheetByPlayer.values()].map((sheet) => sheet.id);
  const chapters =
    sheetIds.length > 0
      ? await prisma.chapter.findMany({
          where: { characterSheetId: { in: sheetIds } },
          select: { characterSheetId: true, content: true, updatedAt: true },
        })
      : [];

  const writingBySheet = new Map<string, RpTrackingPlayerContext["writing"]>();
  for (const chapter of chapters) {
    if (!chapter.characterSheetId) continue;
    const writing = writingBySheet.get(chapter.characterSheetId) ?? {
      chapterCount: 0,
      wordCount: 0,
      lastUpdatedAt: null,
    };
    writing.chapterCount += 1;
    writing.wordCount += countWords(chapter.content);
    if (!writing.lastUpdatedAt || chapter.updatedAt > writing.lastUpdatedAt) {
      writing.lastUpdatedAt = chapter.updatedAt;
    }
    writingBySheet.set(chapter.characterSheetId, writing);
  }

  const lastConnectedByPlayer = new Map<string, Date | null>();
  for (const entry of lastSessions) {
    if (entry.userId) {
      lastConnectedByPlayer.set(entry.userId, entry._max.connectedAt);
    }
  }

  for (const playerId of playerIds) {
    const sheet = sheetByPlayer.get(playerId);
    contexts.set(playerId, {
      character: sheet
        ? {
            id: sheet.id,
            name: sheet.name,
            className:
              (sheet.overrideClassId ? sheet.overrideClass?.name : sheet.primaryClass?.name) ??
              null,
          }
        : null,
      writing: (sheet && writingBySheet.get(sheet.id)) ?? {
        chapterCount: 0,
        wordCount: 0,
        lastUpdatedAt: null,
      },
      lastConnectedAt: lastConnectedByPlayer.get(playerId) ?? null,
    });
  }

  return contexts;
}

export interface RpTrackingLastMessage {
  authorType: MessageAuthorType;
  authorId: string | null;
  authorName: string | null;
  body: string | null;
  hasImage: boolean;
}

/** Dernier échange (hors système) des conversations données, indexé par conversation. */
export async function getRpTrackingLastMessages(
  rows: Pick<RpTrackingPlayerState, "conversationId" | "lastActivityAt">[]
): Promise<Map<string, RpTrackingLastMessage>> {
  const lastMessages = new Map<string, RpTrackingLastMessage>();
  const targets = rows.filter((row) => row.conversationId && row.lastActivityAt);
  if (targets.length === 0) {
    return lastMessages;
  }

  const messages = await prisma.conversationMessage.findMany({
    where: {
      deletedAt: null,
      authorType: { not: MessageAuthorType.SYSTEM },
      OR: targets.map((row) => ({
        conversationId: row.conversationId!,
        createdAt: row.lastActivityAt!,
      })),
    },
    select: {
      conversationId: true,
      authorType: true,
      authorId: true,
      body: true,
      imageUrl: true,
      author: { select: { minecraftUsername: true, discordDisplayName: true } },
    },
  });

  for (const message of messages) {
    lastMessages.set(message.conversationId, {
      authorType: message.authorType,
      authorId: message.authorId,
      authorName: message.author?.minecraftUsername ?? message.author?.discordDisplayName ?? null,
      body: message.body,
      hasImage: Boolean(message.imageUrl),
    });
  }

  return lastMessages;
}

export interface RpTrackingReplyStats {
  /** Délai moyen entre un message joueur resté sans réponse et la réponse du staff. */
  meanReplyMs: number | null;
  repliesCount: number;
  playerMessages: number;
  staffMessages: number;
}

/** Volume d'échanges et réactivité du staff depuis `since` (toute la période si `null`). */
export async function getRpTrackingReplyStats(since: Date | null): Promise<RpTrackingReplyStats> {
  const messages = await prisma.conversationMessage.findMany({
    where: {
      ...EXCHANGE_MESSAGE_WHERE,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
    select: { conversationId: true, authorType: true, createdAt: true },
  });

  const delays: number[] = [];
  let playerMessages = 0;
  let staffMessages = 0;
  let currentConversationId: string | null = null;
  let waitingSince: Date | null = null;

  for (const message of messages) {
    if (message.conversationId !== currentConversationId) {
      currentConversationId = message.conversationId;
      waitingSince = null;
    }
    if (message.authorType === MessageAuthorType.PLAYER) {
      playerMessages += 1;
      waitingSince ??= message.createdAt;
    } else {
      staffMessages += 1;
      if (waitingSince) {
        delays.push(message.createdAt.getTime() - waitingSince.getTime());
        waitingSince = null;
      }
    }
  }

  return {
    meanReplyMs: mean(delays),
    repliesCount: delays.length,
    playerMessages,
    staffMessages,
  };
}
