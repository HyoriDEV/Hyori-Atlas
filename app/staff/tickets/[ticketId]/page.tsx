import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
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
          messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
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
      characterSheet: {
        select: {
          name: true,
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
            {playerName} · {ticketCategoryLabels[ticket.category]} ·{" "}
            {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
          </span>
          <span className="font-heading text-lg font-semibold">{ticket.subject}</span>
        </div>
        <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
          {ticketStatusLabels[ticket.status]}
        </Badge>
        <TicketStatusActions ticketId={ticket.id} status={ticket.status} />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={ticket.conversationId}
            initialMessages={messages.map(serializeConversationMessage)}
            viewerId={staffUser.id}
            viewerIsStaff
            sendAction={async (cId, body, imageUrl) => {
              "use server";
              await sendStaffTicketMessage(ticket.id, body, imageUrl);
            }}
            disabled={ticket.status === TicketStatus.ARCHIVED}
            className="min-h-0 flex-1"
          />
        </div>
        <div className="min-h-0 overflow-y-auto lg:col-span-2">
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
