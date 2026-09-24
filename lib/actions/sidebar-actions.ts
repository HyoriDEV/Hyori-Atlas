"use server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  BdaReportStatus,
  CharacterStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

export async function getPlayerBadgeCounts(userId: string): Promise<Record<string, number>> {
  const [activeSheet, userActiveTickets] = await Promise.all([
    prisma.characterSheet.findFirst({
      where: { playerId: userId, status: CharacterStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { comments: true },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        conversation: { members: { some: { userId } } },
        status: { not: TicketStatus.ARCHIVED },
      },
      select: {
        id: true,
        conversation: {
          select: {
            members: {
              where: { userId },
              select: { lastReadAt: true, joinedAt: true },
            },
            messages: {
              where: {
                deletedAt: null,
                authorId: { not: userId },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    }),
  ]);

  const characterSheet =
    activeSheet ??
    (await prisma.characterSheet.findFirst({
      where: { playerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { comments: true },
        },
      },
    }));

  const staffCommentsCount =
    characterSheet?.hasUnreadFeedback ? characterSheet._count.comments : 0;

  const unreadTicketsCount = userActiveTickets.filter((t) => {
    const member = t.conversation.members[0];
    const lastMessage = t.conversation.messages[0];
    if (!lastMessage) return false;
    const readThreshold = member?.lastReadAt ?? member?.joinedAt ?? new Date(0);
    return lastMessage.createdAt > readThreshold;
  }).length;

  return {
    "/player/character-sheet": staffCommentsCount,
    "/player/tickets": unreadTicketsCount,
  };
}

export async function getStaffBadgeCounts(userId: string): Promise<Record<string, number>> {
  const [
    activeTickets,
    unreadBdaReportsCount,
    atlasPlayersCount,
    registeredInterviewBookingsCount,
  ] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: { not: TicketStatus.ARCHIVED } },
      select: {
        id: true,
        conversation: {
          select: {
            members: {
              where: { userId },
              select: { lastReadAt: true, joinedAt: true },
            },
            messages: {
              where: {
                deletedAt: null,
                authorId: { not: userId },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    }),
    prisma.bdaReport.count({
      where: { status: BdaReportStatus.UNREAD },
    }),
    prisma.user.count({
      where: {
        registrationStatus: {
          notIn: [RegistrationStatus.NEW, RegistrationStatus.REJECTED],
        },
      },
    }),
    prisma.interviewBooking.count({
      where: {
        status: InterviewBookingStatus.REGISTERED,
        slot: {
          startsAt: { gte: new Date() },
        },
      },
    }),
  ]);

  const unreadTicketsCount = activeTickets.filter((t) => {
    const member = t.conversation.members[0];
    const lastMessage = t.conversation.messages[0];
    if (!lastMessage) return false;
    if (!member) return true;
    const readThreshold = member.lastReadAt ?? member.joinedAt;
    return lastMessage.createdAt > readThreshold;
  }).length;

  return {
    "/staff/tickets": unreadTicketsCount,
    "/staff/bda-reports": unreadBdaReportsCount,
    "/staff/atlas": atlasPlayersCount,
    "/staff/interview-slots": registeredInterviewBookingsCount,
  };
}

export async function getSidebarBadgeCountsAction(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user) return {};

  const playerCounts = await getPlayerBadgeCounts(user.id);
  if (user.role === Role.PLAYER) {
    return playerCounts;
  }

  const staffCounts = await getStaffBadgeCounts(user.id);
  return {
    ...playerCounts,
    ...staffCounts,
  };
}
