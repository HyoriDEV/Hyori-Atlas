import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatTicketCategoryName } from "@/lib/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { subject: true },
  });

  if (!ticket?.subject) {
    return { title: "Détail du ticket" };
  }

  const cleanSubject =
    ticket.subject.length > 52 ? `${ticket.subject.slice(0, 49)}...` : ticket.subject;
  return {
    title: `Ticket : ${cleanSubject}`,
  };
}
import { Role, TicketStatus } from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendTicketMessage } from "@/lib/actions/ticket-actions";
import { Badge } from "@/components/ui/badge";
import { TicketBackLink } from "@/components/player/ticket-back-link";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";
import { TicketMembersSheet } from "@/components/dashboard/ticket-members-sheet";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const user = await requireActivePlayer();

  const isStaff = user.role !== Role.PLAYER;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      player: true,
      conversation: {
        include: {
          messages: {
            where: isStaff ? undefined : { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: {
              author: true,
              versions: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          members: {
            orderBy: { joinedAt: "asc" },
            include: { user: true },
          },
        },
      },
    },
  });

  const isMember = ticket && ticket.conversation.members.some((m) => m.userId === user.id);

  if (!ticket || !isMember) {
    notFound();
  }

  // Marquer immédiatement la conversation comme lue pour ce membre
  await prisma.conversationMember.updateMany({
    where: {
      conversationId: ticket.conversationId,
      userId: user.id,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  const messages = ticket.conversation.messages || [];

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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:flex-nowrap">
        <TicketBackLink className="order-1 shrink-0" />
        <div className="order-2 flex items-center gap-1.5 shrink-0 sm:order-3">
          <TicketMembersSheet
            ticketId={ticket.id}
            members={membersData}
            readOnly
            className="lg:hidden"
          />
        </div>
        <div className="order-3 flex min-w-0 w-full flex-1 flex-col gap-1 sm:order-2 sm:w-auto">
          <h1 className="font-heading text-lg font-semibold break-words leading-tight sm:text-xl">
            {ticket.subject}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              {formatTicketCategoryName(ticket.categoryName) || "Ticket"}
            </Badge>
            {ticket.subcategoryName && (
              <span className="text-foreground/80 font-medium">{ticket.subcategoryName}</span>
            )}
            <span className="text-muted-foreground/50">·</span>
            <span className="whitespace-nowrap">
              {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={ticket.conversationId}
            initialMessages={messages.map((m) => serializeConversationMessage(m, false))}
            viewerId={user.id}
            viewerIsStaff={false}
            sendAction={async (cId, body, imageUrl) => {
              "use server";
              return await sendTicketMessage(ticket.id, body, imageUrl);
            }}
            disabled={ticket.status === TicketStatus.ARCHIVED}
            disabledMessage="Ce ticket est archivé. Les réponses sont fermées."
            className="min-h-0 flex-1"
          />
        </div>
        <div className="hidden min-h-0 lg:col-span-2 lg:flex lg:flex-col">
          <TicketMembersManager ticketId={ticket.id} members={membersData} readOnly />
        </div>
      </div>
    </div>
  );
}
