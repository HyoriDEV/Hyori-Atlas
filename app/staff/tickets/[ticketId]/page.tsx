import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
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
import { staffNavItems, ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendStaffTicketMessage } from "@/lib/actions/ticket-actions";
import { Badge } from "@/components/ui/badge";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { TicketStatusActions } from "@/components/dashboard/ticket-status-actions";
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";
import { TicketMembersSheet } from "@/components/dashboard/ticket-members-sheet";

export default async function TicketStaffDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const item = staffNavItems.find((i) => i.href === "/staff/tickets")!;
  const staffUser = await requireRole(item.roles);

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
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
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const allPlayers = await prisma.user.findMany({
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
  });

  const messages = ticket.conversation.messages || [];
  const playerName = ticket.player.minecraftUsername ?? ticket.player.discordDisplayName;

  const membersData = ticket.conversation.members.map((m) => ({
    userId: m.userId,
    minecraftUsername: m.user.minecraftUsername,
    discordDisplayName: m.user.discordDisplayName,
    discordAvatarUrl: m.user.discordAvatarUrl,
  }));

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
          className="lg:hidden"
        />
        <TicketStatusActions ticketId={ticket.id} status={ticket.status} />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={ticket.conversationId}
            initialMessages={messages.map((m) => serializeConversationMessage(m, true))}
            viewerId={staffUser.id}
            viewerIsStaff
            sendAction={async (cId, body, imageUrl) => {
              "use server";
              return await sendStaffTicketMessage(ticket.id, body, imageUrl);
            }}
            disabled={ticket.status === TicketStatus.ARCHIVED}
            disabledMessage="Ce ticket est archivé. Les réponses sont fermées."
            className="min-h-0 flex-1"
          />
        </div>
        <div className="hidden min-h-0 lg:col-span-2 lg:flex lg:flex-col">
          <TicketMembersManager
            ticketId={ticket.id}
            members={membersData}
            availablePlayers={allPlayers}
          />
        </div>
      </div>
    </div>
  );
}
