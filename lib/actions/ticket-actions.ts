"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer, requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ticketStaffRoles } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";
import {
  ConversationType,
  MessageAuthorType,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function createTicket(category: TicketCategory, subject: string, description: string) {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  if (!settings.ticketCreationEnabled) {
    throw new Error("Un administrateur a désactivé l'ouverture de tickets.");
  }

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();

  if (!trimmedSubject || !trimmedDescription) {
    throw new Error("Le sujet et la description sont requis.");
  }

  // Create the conversation, the conversation members, the messages, and the ticket all at once
  const ticket = await prisma.ticket.create({
    data: {
      player: { connect: { id: user.id } },
      category,
      subject: trimmedSubject,
      conversation: {
        create: {
          type: ConversationType.TICKET,
          members: {
            create: [{ userId: user.id }],
          },
          messages: {
            create: [
              {
                authorType: MessageAuthorType.SYSTEM,
                body: `Ticket créé par ${user.minecraftUsername ?? user.discordUsername ?? "un joueur"}.`,
              },
              {
                authorType: MessageAuthorType.PLAYER,
                authorId: user.id,
                body: trimmedDescription,
              },
            ],
          },
        },
      },
    },
    include: { conversation: true },
  });

  // If RP request, also post to the user's RP tracking conversation
  if (category === TicketCategory.RP_REQUEST) {
    // Check if the user has an RP tracking conversation
    let rpConversation = await prisma.conversation.findFirst({
      where: {
        type: ConversationType.RP_TRACKING,
        members: { some: { userId: user.id } },
      },
    });

    if (!rpConversation) {
      rpConversation = await prisma.conversation.create({
        data: {
          type: ConversationType.RP_TRACKING,
          members: {
            create: [{ userId: user.id }],
          },
        },
      });
    }

    const rpTrackingMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: rpConversation.id,
        authorType: MessageAuthorType.SYSTEM,
        body: `${user.minecraftUsername ?? user.discordUsername ?? "Le joueur"} a créé une demande RP.`,
        linkHref: `/staff/tickets/${ticket.id}`,
        linkLabel: trimmedSubject,
      },
      include: { author: true },
    });
    publish(rpConversation.id, serializeConversationMessage(rpTrackingMessage));
  }

  revalidatePath("/player/tickets");
  return { id: ticket.id };
}

export async function sendTicketMessage(ticketId: string, body?: string, imageUrl?: string) {
  const user = await requireActivePlayer();

  const trimmedBody = body?.trim();
  if (!trimmedBody && !imageUrl) {
    throw new Error("Le message ne peut pas être vide.");
  }

  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { conversation: { include: { members: true } } },
  });

  const isMember = ticket.conversation.members.some((m) => m.userId === user.id);

  if (!isMember) {
    throw new Error("Tu n'as pas accès à ce ticket.");
  }
  if (ticket.status === TicketStatus.ARCHIVED) {
    throw new Error("Ce ticket est archivé.");
  }

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.conversationMessage.create({
      data: {
        conversationId: ticket.conversationId,
        authorType: MessageAuthorType.PLAYER,
        authorId: user.id,
        body: trimmedBody || null,
        imageUrl: imageUrl ?? null,
      },
      include: { author: true },
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PENDING_STAFF },
    });

    return newMessage;
  });

  publish(ticket.conversationId, serializeConversationMessage(message));

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");
}

export async function sendStaffTicketMessage(ticketId: string, body?: string, imageUrl?: string) {
  const staffUser = await requireRole(ticketStaffRoles);

  const trimmedBody = body?.trim();
  if (!trimmedBody && !imageUrl) {
    throw new Error("Le message ne peut pas être vide.");
  }

  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  if (ticket.status === TicketStatus.ARCHIVED) {
    throw new Error("Ce ticket est archivé.");
  }

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.conversationMessage.create({
      data: {
        conversationId: ticket.conversationId,
        authorType: MessageAuthorType.STAFF,
        authorId: staffUser.id,
        body: trimmedBody || null,
        imageUrl: imageUrl ?? null,
      },
      include: { author: true },
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PENDING_PLAYER },
    });

    return newMessage;
  });

  publish(ticket.conversationId, serializeConversationMessage(message));

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");
}

export async function archiveTicket(ticketId: string) {
  await requireRole(ticketStaffRoles);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.ARCHIVED },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
}

export async function reopenTicket(ticketId: string) {
  await requireRole(ticketStaffRoles);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.PENDING_STAFF },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
}

export async function addTicketMember(ticketId: string, playerId: string) {
  await requireRole(ticketStaffRoles);

  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  await prisma.conversationMember.upsert({
    where: {
      conversationId_userId: {
        conversationId: ticket.conversationId,
        userId: playerId,
      },
    },
    update: {},
    create: {
      conversationId: ticket.conversationId,
      userId: playerId,
    },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
}

export async function removeTicketMember(ticketId: string, playerId: string) {
  await requireRole(ticketStaffRoles);

  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  await prisma.conversationMember.deleteMany({
    where: {
      conversationId: ticket.conversationId,
      userId: playerId,
    },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
}
