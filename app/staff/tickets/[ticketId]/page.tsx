import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
import {
  backlogManagerRoles,
  backlogRoles,
  ticketCategoryLabels,
  ticketStatusLabels,
  ticketSummonableTeams,
} from "@/lib/navigation";
import { backlogStatusDotClasses, backlogStatusLabels } from "@/lib/backlog";
import { serializeBacklogUser } from "@/lib/services/backlog-service";
import { hasFullTicketAccess, ticketAccessWhere } from "@/lib/ticket-access";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendStaffTicketMessage } from "@/lib/actions/ticket-actions";
import { Badge } from "@/components/ui/badge";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { TicketStatusActions } from "@/components/dashboard/ticket-status-actions";
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";
import { TicketMembersSheet } from "@/components/dashboard/ticket-members-sheet";
import { TicketStaffAccessPanel } from "@/components/dashboard/ticket-staff-access-panel";
import { CreateTaskFromTicketDialog } from "@/components/staff/backlog/create-task-from-ticket-dialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}): Promise<Metadata> {
  const { ticketId } = await params;
  const staffUser = await requireUser();
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, ticketAccessWhere(staffUser)] },
    select: {
      subject: true,
      player: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
        },
      },
    },
  });

  if (ticket?.subject) {
    const cleanSubject =
      ticket.subject.length > 50 ? `${ticket.subject.slice(0, 47)}...` : ticket.subject;
    return { title: `Ticket : ${cleanSubject}` };
  }

  const playerName =
    ticket?.player?.minecraftUsername ||
    ticket?.player?.discordDisplayName ||
    ticket?.player?.discordUsername;
  return {
    title: playerName ? `Ticket de ${playerName}` : "Ticket Staff",
  };
}

export default async function TicketStaffDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const staffUser = await requireUser();
  const canManageAccess = hasFullTicketAccess(staffUser.role);
  const canUseBacklog = backlogRoles.includes(staffUser.role);

  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, ticketAccessWhere(staffUser)] },
    include: {
      player: true,
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              author: true,
              versions: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          members: { include: { user: true } },
          reads: { where: { userId: staffUser.id } },
        },
      },
      teamSummons: { include: { summonedBy: true } },
      staffAccesses: { include: { user: true }, orderBy: { createdAt: "asc" } },
      backlogTasks: {
        where: { archivedAt: null },
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // La lecture précédente sert au séparateur « Nouveaux messages », puis le ticket est marqué lu.
  const previousReadAt = ticket.conversation.reads[0]?.lastReadAt ?? null;
  const readAt = new Date();
  await prisma.conversationRead.upsert({
    where: {
      conversationId_userId: {
        conversationId: ticket.conversationId,
        userId: staffUser.id,
      },
    },
    create: { conversationId: ticket.conversationId, userId: staffUser.id, lastReadAt: readAt },
    update: { lastReadAt: readAt },
  });

  const [allPlayers, summonableStaff, backlogAssignees] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        minecraftUsername: true,
        discordDisplayName: true,
        discordUsername: true,
        discordAvatarUrl: true,
        role: true,
        registrationStatus: true,
        characterSheets: {
          select: {
            name: true,
            status: true,
          },
        },
      },
      orderBy: { discordDisplayName: "asc" },
    }),
    canManageAccess
      ? prisma.user.findMany({
          where: { role: { in: ticketSummonableTeams } },
          select: {
            id: true,
            minecraftUsername: true,
            discordDisplayName: true,
            discordUsername: true,
            discordAvatarUrl: true,
            role: true,
          },
          orderBy: { discordDisplayName: "asc" },
        })
      : [],
    canUseBacklog
      ? prisma.user.findMany({
          where: { role: { in: backlogManagerRoles } },
          select: {
            id: true,
            minecraftUsername: true,
            discordDisplayName: true,
            discordAvatarUrl: true,
            role: true,
          },
          orderBy: { discordDisplayName: "asc" },
        })
      : [],
  ]);

  const messages = ticket.conversation.messages || [];
  const playerName = ticket.player.minecraftUsername ?? ticket.player.discordDisplayName;

  const membersData = ticket.conversation.members
    .filter((m) => m.user.role === Role.PLAYER || m.userId === ticket.playerId)
    .map((m) => ({
      userId: m.userId,
      minecraftUsername: m.user.minecraftUsername,
      discordDisplayName: m.user.discordDisplayName,
      discordAvatarUrl: m.user.discordAvatarUrl,
      isCreator: m.userId === ticket.playerId,
    }));

  // Le panneau d'accès n'est jamais rendu pour les équipes convoquées : la convocation
  // ne doit pas être visible de leur côté.
  const staffAccessPanel = canManageAccess ? (
    <TicketStaffAccessPanel
      ticketId={ticket.id}
      teams={ticketSummonableTeams.map((team) => {
        const summon = ticket.teamSummons.find((s) => s.team === team);
        return {
          team,
          summonedAt: summon ? summon.createdAt.toISOString() : null,
          summonedByName: summon?.summonedBy
            ? (summon.summonedBy.minecraftUsername ?? summon.summonedBy.discordDisplayName)
            : null,
        };
      })}
      staffMembers={ticket.staffAccesses.map((access) => ({
        userId: access.userId,
        role: access.user.role,
        minecraftUsername: access.user.minecraftUsername,
        discordDisplayName: access.user.discordDisplayName,
        discordAvatarUrl: access.user.discordAvatarUrl,
      }))}
      availableStaff={summonableStaff}
    />
  ) : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <AtlasBackButton href="/staff/tickets" />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            <Link
              href={`/staff/atlas/${ticket.playerId}`}
              className="hover:text-foreground font-medium underline-offset-4 hover:underline"
              title={`Voir la fiche Atlas de ${playerName}`}
            >
              {playerName}
            </Link>{" "}
            · {ticketCategoryLabels[ticket.category]} ·{" "}
            {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
          </span>
          <span className="font-heading text-lg font-semibold">{ticket.subject}</span>
          {canUseBacklog && ticket.backlogTasks.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ticket.backlogTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/staff/backlog?task=${task.id}`}
                  title={`Tâche du backlog : ${task.title}`}
                  className="border-border hover:bg-muted inline-flex max-w-64 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${backlogStatusDotClasses[task.status]}`}
                  />
                  <span className="truncate">{task.title}</span>
                  <span className="text-muted-foreground shrink-0">
                    · {backlogStatusLabels[task.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        {ticket.status !== TicketStatus.ARCHIVED && (
          <Badge variant={ticketStatusBadgeVariant(ticket.status)} className="shrink-0">
            {ticketStatusLabels[ticket.status]}
          </Badge>
        )}
        <TicketMembersSheet
          ticketId={ticket.id}
          members={membersData}
          availablePlayers={allPlayers}
          staffAccessPanel={staffAccessPanel}
          className="lg:hidden"
        />
        {canUseBacklog && (
          <CreateTaskFromTicketDialog
            ticketId={ticket.id}
            ticketSubject={ticket.subject}
            assignees={backlogAssignees.map(serializeBacklogUser)}
            canSummonDevelopers={
              canManageAccess && !ticket.teamSummons.some((s) => s.team === Role.DEVELOPER)
            }
            defaultSummonDevelopers={ticket.category === TicketCategory.BUG_REPORT}
          />
        )}
        <TicketStatusActions
          ticketId={ticket.id}
          status={ticket.status}
          isAdmin={staffUser.role === Role.ADMIN}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={ticket.conversationId}
            initialMessages={messages.map((m) => serializeConversationMessage(m, true))}
            viewerId={staffUser.id}
            viewerIsStaff
            unreadSince={previousReadAt?.toISOString() ?? null}
            sendAction={async (cId, body, imageUrl) => {
              "use server";
              return await sendStaffTicketMessage(ticket.id, body, imageUrl);
            }}
            disabled={ticket.status === TicketStatus.ARCHIVED}
            disabledMessage="Ce ticket est archivé. Les réponses sont fermées."
            className="min-h-0 flex-1"
          />
        </div>
        <div className="hidden min-h-0 gap-4 overflow-y-auto lg:col-span-2 lg:flex lg:flex-col">
          {staffAccessPanel}
          <TicketMembersManager
            ticketId={ticket.id}
            members={membersData}
            availablePlayers={allPlayers}
            className={canManageAccess ? "h-auto min-h-48 flex-1" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
