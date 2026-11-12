import "server-only";

import { prisma } from "@/lib/prisma";
import { CharacterStatus, MessageAuthorType } from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";

export interface RpTrackingGroupMemberInfo {
  userId: string;
  playerName: string;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  character: {
    id: string;
    name: string;
    className: string | null;
  } | null;
  joinedAt: Date;
}

export interface RpTrackingGroupSummary {
  id: string;
  name: string;
  description: string | null;
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  createdByName: string | null;
  members: RpTrackingGroupMemberInfo[];
  memberCount: number;
  messageCount: number;
  lastActivityAt: Date | null;
  isPending: boolean;
  isHandledWithoutReply: boolean;
  lastHandledAt: Date | null;
  lastHandledByName: string | null;
  unreadCount?: number;
  lastMessage?: {
    body: string | null;
    hasImage: boolean;
    authorName: string | null;
    authorId: string | null;
    createdAt: Date;
  } | null;
}

export interface RpTrackingGroupDetail extends RpTrackingGroupSummary {
  messages: SerializedConversationMessage[];
}

/**
 * Récupère tous les groupes de suivi RP pour la gestion staff.
 */
export async function getAllRpTrackingGroups(): Promise<RpTrackingGroupSummary[]> {
  const groups = await prisma.rpTrackingGroup.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      conversation: {
        include: {
          lastHandledBy: {
            select: {
              minecraftUsername: true,
              discordDisplayName: true,
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              body: true,
              imageUrl: true,
              authorType: true,
              authorId: true,
              author: {
                select: {
                  minecraftUsername: true,
                  discordDisplayName: true,
                },
              },
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              minecraftUsername: true,
              discordDisplayName: true,
              discordUsername: true,
              discordAvatarUrl: true,
              characterSheets: {
                where: { status: CharacterStatus.ACTIVE },
                take: 1,
                select: {
                  id: true,
                  name: true,
                  overrideClass: { select: { name: true } },
                  primaryClass: { select: { name: true } },
                },
              },
            },
          },
          characterSheet: {
            select: {
              id: true,
              name: true,
              overrideClass: { select: { name: true } },
              primaryClass: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return groups.map((g) => {
    const messages = g.conversation.messages;
    const lastPlayerMsg = messages.find((m) => m.authorType === MessageAuthorType.PLAYER);
    const lastStaffMsg = messages.find((m) => m.authorType === MessageAuthorType.STAFF);

    const lastPlayerTime = lastPlayerMsg ? lastPlayerMsg.createdAt.getTime() : 0;
    const lastStaffTime = lastStaffMsg ? lastStaffMsg.createdAt.getTime() : 0;
    const lastHandledTime = g.conversation.lastHandledAt
      ? g.conversation.lastHandledAt.getTime()
      : 0;

    const isPending = Boolean(
      lastPlayerTime > 0 && lastStaffTime < lastPlayerTime && lastHandledTime < lastPlayerTime
    );

    const isHandledWithoutReply = Boolean(
      !isPending &&
      lastHandledTime > 0 &&
      lastPlayerTime > 0 &&
      lastHandledTime >= lastPlayerTime &&
      (!lastStaffTime || lastHandledTime >= lastStaffTime)
    );

    const lastMsg = messages[0];
    const lastMessage = lastMsg
      ? {
          body: lastMsg.body,
          hasImage: Boolean(lastMsg.imageUrl),
          authorId: lastMsg.authorId,
          authorName:
            lastMsg.author?.minecraftUsername ?? lastMsg.author?.discordDisplayName ?? "Inconnu",
          createdAt: lastMsg.createdAt,
        }
      : null;

    const lastActivityAt = messages[0]?.createdAt ?? g.createdAt;

    const members: RpTrackingGroupMemberInfo[] = g.members.map((m) => {
      const activeSheet = m.characterSheet ?? m.user.characterSheets[0];
      return {
        userId: m.user.id,
        playerName: m.user.minecraftUsername ?? m.user.discordDisplayName,
        minecraftUsername: m.user.minecraftUsername,
        discordDisplayName: m.user.discordDisplayName,
        discordUsername: m.user.discordUsername,
        discordAvatarUrl: m.user.discordAvatarUrl,
        character: activeSheet
          ? {
              id: activeSheet.id,
              name: activeSheet.name,
              className: activeSheet.overrideClass?.name ?? activeSheet.primaryClass?.name ?? null,
            }
          : null,
        joinedAt: m.joinedAt,
      };
    });

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      conversationId: g.conversationId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      createdById: g.createdById,
      createdByName: g.createdBy?.minecraftUsername ?? g.createdBy?.discordDisplayName ?? null,
      members,
      memberCount: members.length,
      messageCount: g.conversation._count.messages,
      lastActivityAt,
      isPending,
      isHandledWithoutReply,
      lastHandledAt: g.conversation.lastHandledAt,
      lastHandledByName:
        g.conversation.lastHandledBy?.minecraftUsername ??
        g.conversation.lastHandledBy?.discordDisplayName ??
        null,
      lastMessage,
    };
  });
}

/**
 * Récupère le détail complet d'un groupe de suivi RP (pour staff ou membre du groupe).
 */
export async function getRpTrackingGroupDetail(
  groupId: string,
  viewerId?: string
): Promise<RpTrackingGroupDetail | null> {
  const group = await prisma.rpTrackingGroup.findUnique({
    where: { id: groupId },
    include: {
      createdBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      conversation: {
        include: {
          lastHandledBy: {
            select: {
              minecraftUsername: true,
              discordDisplayName: true,
            },
          },
          members: viewerId
            ? {
                where: { userId: viewerId },
                select: { lastReadAt: true, joinedAt: true },
              }
            : false,
          messages: {
            where: { deletedAt: null },
            include: {
              author: true,
              versions: {
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          _count: {
            select: {
              messages: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              minecraftUsername: true,
              discordDisplayName: true,
              discordUsername: true,
              discordAvatarUrl: true,
              characterSheets: {
                where: { status: CharacterStatus.ACTIVE },
                take: 1,
                select: {
                  id: true,
                  name: true,
                  overrideClass: { select: { name: true } },
                  primaryClass: { select: { name: true } },
                },
              },
            },
          },
          characterSheet: {
            select: {
              id: true,
              name: true,
              overrideClass: { select: { name: true } },
              primaryClass: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!group) return null;

  const messages = group.conversation.messages;
  const lastPlayerMsg = messages.find((m) => m.authorType === MessageAuthorType.PLAYER);
  const lastStaffMsg = messages.find((m) => m.authorType === MessageAuthorType.STAFF);

  const lastPlayerTime = lastPlayerMsg ? lastPlayerMsg.createdAt.getTime() : 0;
  const lastStaffTime = lastStaffMsg ? lastStaffMsg.createdAt.getTime() : 0;
  const lastHandledTime = group.conversation.lastHandledAt
    ? group.conversation.lastHandledAt.getTime()
    : 0;

  const isPending = Boolean(
    lastPlayerTime > 0 && lastStaffTime < lastPlayerTime && lastHandledTime < lastPlayerTime
  );

  const isHandledWithoutReply = Boolean(
    !isPending &&
    lastHandledTime > 0 &&
    lastPlayerTime > 0 &&
    lastHandledTime >= lastPlayerTime &&
    (!lastStaffTime || lastHandledTime >= lastStaffTime)
  );

  const members: RpTrackingGroupMemberInfo[] = group.members.map((m) => {
    const activeSheet = m.characterSheet ?? m.user.characterSheets[0];
    return {
      userId: m.user.id,
      playerName: m.user.minecraftUsername ?? m.user.discordDisplayName,
      minecraftUsername: m.user.minecraftUsername,
      discordDisplayName: m.user.discordDisplayName,
      discordUsername: m.user.discordUsername,
      discordAvatarUrl: m.user.discordAvatarUrl,
      character: activeSheet
        ? {
            id: activeSheet.id,
            name: activeSheet.name,
            className: activeSheet.overrideClass?.name ?? activeSheet.primaryClass?.name ?? null,
          }
        : null,
      joinedAt: m.joinedAt,
    };
  });

  let unreadCount = 0;
  if (viewerId && group.conversation.members && group.conversation.members[0]) {
    const membership = group.conversation.members[0];
    const threshold = membership.lastReadAt ?? membership.joinedAt;
    unreadCount = messages.filter((m) => m.authorId !== viewerId && m.createdAt > threshold).length;
  }

  const serializedMessages = [...messages]
    .reverse()
    .map((m) => serializeConversationMessage(m, false));

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    conversationId: group.conversationId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    createdById: group.createdById,
    createdByName:
      group.createdBy?.minecraftUsername ?? group.createdBy?.discordDisplayName ?? null,
    members,
    memberCount: members.length,
    messageCount: group.conversation._count.messages,
    lastActivityAt: messages[0]?.createdAt ?? group.createdAt,
    isPending,
    isHandledWithoutReply,
    lastHandledAt: group.conversation.lastHandledAt,
    lastHandledByName:
      group.conversation.lastHandledBy?.minecraftUsername ??
      group.conversation.lastHandledBy?.discordDisplayName ??
      null,
    unreadCount,
    messages: serializedMessages,
  };
}

/**
 * Récupère les groupes de suivi RP auxquels un joueur appartient.
 */
export async function getUserRpTrackingGroups(userId: string): Promise<RpTrackingGroupSummary[]> {
  const memberships = await prisma.rpTrackingGroupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.groupId);

  const groups = await prisma.rpTrackingGroup.findMany({
    where: { id: { in: groupIds } },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      conversation: {
        include: {
          lastHandledBy: {
            select: {
              minecraftUsername: true,
              discordDisplayName: true,
            },
          },
          members: {
            where: { userId },
            select: { lastReadAt: true, joinedAt: true },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              authorId: true,
              authorType: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              minecraftUsername: true,
              discordDisplayName: true,
              discordUsername: true,
              discordAvatarUrl: true,
              characterSheets: {
                where: { status: CharacterStatus.ACTIVE },
                take: 1,
                select: {
                  id: true,
                  name: true,
                  overrideClass: { select: { name: true } },
                  primaryClass: { select: { name: true } },
                },
              },
            },
          },
          characterSheet: {
            select: {
              id: true,
              name: true,
              overrideClass: { select: { name: true } },
              primaryClass: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return groups.map((g) => {
    const member = g.conversation.members[0];
    const lastMsg = g.conversation.messages[0];
    const threshold = member?.lastReadAt ?? member?.joinedAt ?? new Date(0);
    const unreadCount =
      lastMsg && lastMsg.authorId !== userId && lastMsg.createdAt > threshold ? 1 : 0;

    const members: RpTrackingGroupMemberInfo[] = g.members.map((m) => {
      const activeSheet = m.characterSheet ?? m.user.characterSheets[0];
      return {
        userId: m.user.id,
        playerName: m.user.minecraftUsername ?? m.user.discordDisplayName,
        minecraftUsername: m.user.minecraftUsername,
        discordDisplayName: m.user.discordDisplayName,
        discordUsername: m.user.discordUsername,
        discordAvatarUrl: m.user.discordAvatarUrl,
        character: activeSheet
          ? {
              id: activeSheet.id,
              name: activeSheet.name,
              className: activeSheet.overrideClass?.name ?? activeSheet.primaryClass?.name ?? null,
            }
          : null,
        joinedAt: m.joinedAt,
      };
    });

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      conversationId: g.conversationId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      createdById: g.createdById,
      createdByName: g.createdBy?.minecraftUsername ?? g.createdBy?.discordDisplayName ?? null,
      members,
      memberCount: members.length,
      messageCount: g.conversation._count.messages,
      lastActivityAt: lastMsg?.createdAt ?? g.createdAt,
      isPending: false,
      isHandledWithoutReply: false,
      lastHandledAt: g.conversation.lastHandledAt,
      lastHandledByName:
        g.conversation.lastHandledBy?.minecraftUsername ??
        g.conversation.lastHandledBy?.discordDisplayName ??
        null,
      unreadCount,
    };
  });
}

/**
 * Nombre de groupes de suivi RP en attente d'une réponse staff.
 */
export async function getPendingGroupRpTrackingCount(): Promise<number> {
  const groups = await getAllRpTrackingGroups();
  return groups.filter((g) => g.isPending).length;
}
