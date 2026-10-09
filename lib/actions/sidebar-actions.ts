"use server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getUnreadTickets } from "@/lib/ticket-access";
import { backlogRoles } from "@/lib/navigation";
import {
  BacklogStatus,
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
        OR: [
          { playerId: userId },
          {
            conversation: {
              members: {
                some: {
                  userId,
                  user: { role: Role.PLAYER },
                },
              },
            },
          },
        ],
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

  const staffCommentsCount = characterSheet?.hasUnreadFeedback ? characterSheet._count.comments : 0;

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

export async function getStaffBadgeCounts(
  userId: string,
  role: Role
): Promise<Record<string, number>> {
  const [
    unreadTickets,
    unreadBdaReportsCount,
    atlasPlayersCount,
    registeredInterviewBookingsCount,
    assignedBacklogTasksCount,
  ] = await Promise.all([
    getUnreadTickets({ id: userId, role }),
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
    backlogRoles.includes(role)
      ? prisma.backlogTask.count({
          where: {
            assigneeId: userId,
            archivedAt: null,
            status: { not: BacklogStatus.DONE },
          },
        })
      : 0,
  ]);

  return {
    "/staff/tickets": unreadTickets.length,
    "/staff/bda-reports": unreadBdaReportsCount,
    "/staff/atlas": atlasPlayersCount,
    "/staff/interview-slots": registeredInterviewBookingsCount,
    "/staff/backlog": assignedBacklogTasksCount,
  };
}

export async function getSidebarBadgeCountsAction(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user) return {};

  const playerCounts = await getPlayerBadgeCounts(user.id);
  if (user.role === Role.PLAYER) {
    return playerCounts;
  }

  const staffCounts = await getStaffBadgeCounts(user.id, user.role);
  return {
    ...playerCounts,
    ...staffCounts,
  };
}
