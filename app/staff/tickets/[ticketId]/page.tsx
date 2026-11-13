import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, TicketStatus } from "@/lib/generated/prisma/enums";
import { backlogManagerRoles, backlogRoles } from "@/lib/navigation";
import { backlogStatusDotClasses, backlogStatusLabels } from "@/lib/backlog";
import { serializeBacklogUser } from "@/lib/services/backlog-service";
import { ticketAccessWhere } from "@/lib/ticket-access";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { formatDaysSince, formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendStaffTicketMessage } from "@/lib/actions/ticket-actions";
import { getTicketConfigData } from "@/lib/actions/ticket-config-actions";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { TicketStatusActions } from "@/components/dashboard/ticket-status-actions";
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";
import { TicketMembersSheet } from "@/components/dashboard/ticket-members-sheet";
import { TicketActionsMenu } from "@/components/staff/tickets/ticket-actions-menu";
import { TicketCategoryBadgeEditor } from "@/components/staff/tickets/ticket-category-badge-editor";

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
      ticket.subject.length > 52 ? `${ticket.subject.slice(0, 49)}...` : ticket.subject;
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

  const [allPlayers, backlogAssignees, availableCategories] = await Promise.all([
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
    getTicketConfigData(),
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Informations principales (retour + titre + métadonnées) */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AtlasBackButton href="/staff/tickets" className="mt-0.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="font-heading text-base font-semibold break-words leading-snug sm:text-lg">
              {ticket.subject}
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <Link
                href={`/staff/atlas/${ticket.playerId}`}
                className="hover:text-foreground font-medium underline-offset-4 hover:underline"
                title={`Voir la fiche Atlas de ${playerName}`}
              >
                {playerName}
              </Link>
              <span className="text-muted-foreground/50">·</span>
              <TicketCategoryBadgeEditor
                ticketId={ticket.id}
                categoryId={ticket.categoryId}
                subcategoryId={ticket.subcategoryId}
                categoryName={ticket.categoryName}
                subcategoryName={ticket.subcategoryName}
                category={ticket.category}
                availableCategories={availableCategories}
              />
              <span className="text-muted-foreground/50">·</span>
              <span className="whitespace-nowrap">
                {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
              </span>
              {ticket.suspendedAt && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                  >
                    <Clock className="size-2.5 shrink-0" />
                    <span className="whitespace-nowrap">
                      En suspens ({formatDaysSince(ticket.suspendedAt)})
                    </span>
                  </Badge>
                </>
              )}
            </div>
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
        </div>

        {/* Actions : une ligne sous les informations sur mobile, à droite sur grand écran */}
        <div className="flex items-center gap-2 pl-11 shrink-0 sm:pl-0">
          <TicketMembersSheet
            ticketId={ticket.id}
            members={membersData}
            availablePlayers={allPlayers}
            className="lg:hidden"
          />
          <TicketActionsMenu
            ticketId={ticket.id}
            ticketSubject={ticket.subject}
            canUseBacklog={canUseBacklog}
            backlogAssignees={backlogAssignees.map(serializeBacklogUser)}
          />
          <TicketStatusActions
            ticketId={ticket.id}
            status={ticket.status}
            isSuspended={Boolean(ticket.suspendedAt)}
            isAdmin={staffUser.role === Role.ADMIN}
          />
        </div>
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
          <TicketMembersManager
            ticketId={ticket.id}
            members={membersData}
            availablePlayers={allPlayers}
            className="h-auto min-h-48 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
