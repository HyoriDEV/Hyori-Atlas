"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer, requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ticketCategoryLabels, ticketStaffRoles } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";
import {
  ConversationType,
  MessageAuthorType,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { notifyPlayerTicketMessage, notifyTicketCreated } from "@/lib/services/discord-bot-service";
import {
  getEffectiveDiscordOverride,
  getTicketCreationNotificationConfig,
} from "@/lib/services/discord-template-service";

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
            create: [{ userId: user.id, lastReadAt: new Date() }],
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

  // Déclencher la notification Discord d'ouverture de ticket (salon externe Staff)
  const categoryLabel = ticketCategoryLabels[category] ?? category;
  const authorName =
    user.minecraftUsername ?? user.discordDisplayName ?? user.discordUsername ?? "Un joueur";
  const ticketStaffUrl = `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/staff/tickets/${ticket.id}`;

  getTicketCreationNotificationConfig({
    author: authorName,
    subject: trimmedSubject,
    category: categoryLabel,
    description: trimmedDescription,
    ticketId: ticket.id,
    url: ticketStaffUrl,
  })
    .then((config) => {
      if (config.enabled) {
        return notifyTicketCreated({
          channelId: config.channelId,
          mentionRoleId: config.mentionRoleId,
          ticketId: ticket.id,
          ticketSubject: trimmedSubject,
          ticketCategory: categoryLabel,
          authorName,
          ticketDescription: trimmedDescription,
          customTicketStaffUrl: ticketStaffUrl,
          override: config.override,
        });
      }
    })
    .catch((err) => {
      console.warn(
        "[TicketNotification] Échec lors de la notification d'ouverture de ticket:",
        err
      );
    });

  revalidatePath("/player/tickets");
  return { id: ticket.id };
}

export async function sendTicketMessage(
  ticketId: string,
  body?: string,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireActivePlayer();

  const trimmedBody = body?.trim();
  if (!trimmedBody && !imageUrl) {
    return { success: false, error: "Le message ne peut pas être vide." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { conversation: { include: { members: true } } },
  });

  if (!ticket) {
    return { success: false, error: "Ticket introuvable." };
  }

  const isMember = ticket.conversation.members.some((m) => m.userId === user.id);

  if (!isMember) {
    return { success: false, error: "Tu n'as pas accès à ce ticket." };
  }
  if (ticket.status === TicketStatus.ARCHIVED) {
    return { success: false, error: "Ce ticket est archivé. Les réponses sont fermées." };
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

    await tx.conversationMember.updateMany({
      where: {
        conversationId: ticket.conversationId,
        userId: user.id,
      },
      data: {
        lastReadAt: newMessage.createdAt,
      },
    });

    return newMessage;
  });

  publish(ticket.conversationId, serializeConversationMessage(message));

  // Déclencher les notifications Discord pour les autres membres du ticket (anti-spam)
  const authorName = user.minecraftUsername ?? user.discordDisplayName ?? "Un joueur";
  dispatchTicketMessageNotifications({
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    conversationId: ticket.conversationId,
    authorId: user.id,
    authorName,
    newMessageId: message.id,
    messageBody: message.body,
    hasImage: Boolean(message.imageUrl),
    ticketPlayerId: ticket.playerId,
  }).catch(() => {});

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");

  return { success: true };
}

export async function sendStaffTicketMessage(
  ticketId: string,
  body?: string,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const staffUser = await requireRole(ticketStaffRoles);

  const trimmedBody = body?.trim();
  if (!trimmedBody && !imageUrl) {
    return { success: false, error: "Le message ne peut pas être vide." };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return { success: false, error: "Ticket introuvable." };
  }
  if (ticket.status === TicketStatus.ARCHIVED) {
    return { success: false, error: "Ce ticket est archivé. Les réponses sont fermées." };
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

    await tx.conversationMember.upsert({
      where: {
        conversationId_userId: {
          conversationId: ticket.conversationId,
          userId: staffUser.id,
        },
      },
      create: {
        conversationId: ticket.conversationId,
        userId: staffUser.id,
        lastReadAt: newMessage.createdAt,
      },
      update: {
        lastReadAt: newMessage.createdAt,
      },
    });

    return newMessage;
  });

  publish(ticket.conversationId, serializeConversationMessage(message));

  // Déclencher les notifications Discord pour les joueurs membres du ticket (anti-spam)
  const authorName =
    staffUser.minecraftUsername ?? staffUser.discordDisplayName ?? "L'équipe staff";
  dispatchTicketMessageNotifications({
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    conversationId: ticket.conversationId,
    authorId: staffUser.id,
    authorName,
    newMessageId: message.id,
    messageBody: message.body,
    hasImage: Boolean(message.imageUrl),
    ticketPlayerId: ticket.playerId,
  }).catch(() => {});

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");

  return { success: true };
}

export async function archiveTicket(ticketId: string) {
  await requireRole(ticketStaffRoles);

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.ARCHIVED },
  });

  publish(ticket.conversationId, {
    type: "STATUS_CHANGE",
    status: TicketStatus.ARCHIVED,
    conversationId: ticket.conversationId,
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
}

export async function reopenTicket(ticketId: string) {
  await requireRole(ticketStaffRoles);

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.PENDING_STAFF },
  });

  publish(ticket.conversationId, {
    type: "STATUS_CHANGE",
    status: TicketStatus.PENDING_STAFF,
    conversationId: ticket.conversationId,
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
      lastReadAt: new Date(),
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

async function dispatchTicketMessageNotifications({
  ticketId,
  ticketSubject,
  conversationId,
  authorId,
  authorName,
  newMessageId,
  messageBody,
  hasImage,
  ticketPlayerId,
}: {
  ticketId: string;
  ticketSubject: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  newMessageId: string;
  messageBody?: string | null;
  hasImage?: boolean;
  ticketPlayerId?: string;
}): Promise<void> {
  try {
    // Trouver tous les membres de la conversation qui sont soit le créateur du ticket (même s'il est staff),
    // soit des joueurs, et qui ne sont pas l'auteur du message courant
    const candidateMembers = await prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { not: authorId },
        OR: [
          ...(ticketPlayerId ? [{ userId: ticketPlayerId }] : []),
          { user: { role: Role.PLAYER } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
          },
        },
      },
    });

    if (candidateMembers.length === 0) {
      return;
    }

    const previewText = messageBody ? messageBody : hasImage ? "[Image partagée]" : null;

    // Récupérer l'override éventuel pour TICKET_MESSAGE
    const override = await getEffectiveDiscordOverride("TICKET_MESSAGE", {
      author: authorName,
      subject: ticketSubject,
      preview: previewText ?? "",
      url: `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/player/tickets/${ticketId}`,
    }).catch(() => null);

    // Pour chaque membre éligible, vérifier s'il avait des messages non lus antérieurs à ce nouveau message
    for (const member of candidateMembers) {
      if (!member.user.discordId) continue;

      const lastReadThreshold = member.lastReadAt ?? member.joinedAt;

      const priorUnreadMessage = await prisma.conversationMessage.findFirst({
        where: {
          conversationId,
          id: { not: newMessageId },
          deletedAt: null,
          authorId: { not: member.userId }, // on ne compte pas les propres messages du membre
          createdAt: { gt: lastReadThreshold },
        },
        select: { id: true },
      });

      // Si priorUnreadMessage est null, le membre avait tout lu jusqu'alors : ce message est son premier non-lu !
      // On déclenche donc une notification Discord unique en MP.
      if (!priorUnreadMessage) {
        notifyPlayerTicketMessage({
          discordId: member.user.discordId,
          ticketId,
          ticketSubject,
          authorName,
          messagePreview: previewText,
          override: override ?? undefined,
        }).catch((err) => {
          console.warn(
            `[TicketNotification] Échec lors de la notification Discord pour ${member.userId}:`,
            err
          );
        });
      }
    }
  } catch (err) {
    console.warn("[TicketNotification] Erreur globale lors du calcul des notifications:", err);
  }
}
