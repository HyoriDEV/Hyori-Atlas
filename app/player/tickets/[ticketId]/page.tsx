import { notFound } from "next/navigation";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, TicketStatus } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendTicketMessage } from "@/lib/actions/ticket-actions";
import { Badge } from "@/components/ui/badge";
import { TicketBackLink } from "@/components/player/ticket-back-link";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const user = await requireActivePlayer();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      player: true,
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
          members: {
            orderBy: { joinedAt: "asc" },
            include: { user: true },
          },
        },
      },
    },
  });

  const isStaff = user.role !== Role.PLAYER;
  const isMember = ticket && ticket.conversation.members.some((m) => m.userId === user.id);

  if (!ticket || (!isStaff && !isMember)) {
    notFound();
  }

  const messages = ticket.conversation.messages || [];

  const membersData = ticket.conversation.members.map((m) => ({
    userId: m.userId,
    minecraftUsername: m.user.minecraftUsername,
    discordDisplayName: m.user.discordDisplayName,
    discordAvatarUrl: m.user.discordAvatarUrl,
  }));

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <TicketBackLink />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {ticketCategoryLabels[ticket.category]} ·{" "}
            {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
          </span>
          <span className="font-heading text-lg font-semibold">{ticket.subject}</span>
        </div>
        <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
          {ticketStatusLabels[ticket.status]}
        </Badge>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={ticket.conversationId}
            initialMessages={messages.map(serializeConversationMessage)}
            viewerId={user.id}
            viewerIsStaff={isStaff}
            sendAction={async (cId, body, imageUrl) => {
              "use server";
              await sendTicketMessage(ticket.id, body, imageUrl);
            }}
            disabled={ticket.status === TicketStatus.ARCHIVED}
            className="min-h-0 flex-1"
          />
        </div>
        <div className="min-h-0 overflow-y-auto lg:col-span-2">
          <TicketMembersManager ticketId={ticket.id} members={membersData} readOnly />
        </div>
      </div>
    </div>
  );
}
