"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer, requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  allStaffRoles,
  ticketCategoryLabels,
  ticketStaffRoles,
  ticketSummonableTeams,
} from "@/lib/navigation";
import { getUnreadTickets, ticketAccessWhere } from "@/lib/ticket-access";
import { TICKET_SUMMON_TEMPLATE_IDS } from "@/lib/discord-template-constants";
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
import {
  notifyPlayerTicketMessage,
  notifyTicketCreated,
  notifyTicketTeamSummoned,
} from "@/lib/services/discord-bot-service";
import {
  getEffectiveDiscordOverride,
  getTicketChannelNotificationConfig,
} from "@/lib/services/discord-template-service";

const BOT_TICKET_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Charge le ticket si le staff connecté y a accès (accès complet, équipe convoquée ou ajout
 * individuel). Un ticket inaccessible est indiscernable d'un ticket inexistant.
 */
async function findAccessibleTicket(ticketId: string) {
  const staffUser = await requireUser();
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, ticketAccessWhere(staffUser)] },
  });
  return { staffUser, ticket };
}

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

  getTicketChannelNotificationConfig("TICKET_CREATED", {
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
      data: { status: TicketStatus.PENDING_STAFF, lastMessageAt: newMessage.createdAt },
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
  const trimmedBody = body?.trim();
  if (!trimmedBody && !imageUrl) {
    return { success: false, error: "Le message ne peut pas être vide." };
  }

  const { staffUser, ticket } = await findAccessibleTicket(ticketId);
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
      data: { status: TicketStatus.PENDING_PLAYER, lastMessageAt: newMessage.createdAt },
    });

    await tx.conversationRead.upsert({
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
      update: { lastReadAt: newMessage.createdAt },
    });

    return newMessage;
  });

  publish(ticket.conversationId, serializeConversationMessage(message, true));

  // Déclencher les notifications Discord pour les joueurs membres du ticket (anti-spam anonymisé)
  const authorName = "L'équipe staff";
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

export async function setTicketTeamSummon(
  ticketId: string,
  team: Role,
  summoned: boolean
): Promise<{
  success: boolean;
  error?: string;
  discord?: "sent" | "failed" | "disabled";
}> {
  const staffUser = await requireRole(ticketStaffRoles);

  const templateId = TICKET_SUMMON_TEMPLATE_IDS[team];
  if (!ticketSummonableTeams.includes(team) || !templateId) {
    return { success: false, error: "Cette équipe ne peut pas être convoquée." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { player: true },
  });

  if (!ticket) {
    return { success: false, error: "Ticket introuvable." };
  }

  if (!summoned) {
    await prisma.ticketTeamSummon.deleteMany({ where: { ticketId, team } });
    revalidatePath(`/staff/tickets/${ticketId}`);
    revalidatePath("/staff/tickets");
    return { success: true };
  }

  const existing = await prisma.ticketTeamSummon.findUnique({
    where: { ticketId_team: { ticketId, team } },
  });
  if (existing) {
    return { success: true };
  }

  await prisma.ticketTeamSummon.create({
    data: { ticketId, team, summonedById: staffUser.id },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");

  // La notification reprend la présentation d'une ouverture de ticket, description comprise.
  const firstPlayerMessage = await prisma.conversationMessage.findFirst({
    where: {
      conversationId: ticket.conversationId,
      authorType: MessageAuthorType.PLAYER,
      deletedAt: null,
      body: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { body: true },
  });

  const categoryLabel = ticketCategoryLabels[ticket.category] ?? ticket.category;
  const authorName =
    ticket.player.minecraftUsername ??
    ticket.player.discordDisplayName ??
    ticket.player.discordUsername ??
    "Un joueur";
  const description = (firstPlayerMessage?.body ?? ticket.subject).slice(
    0,
    BOT_TICKET_DESCRIPTION_MAX_LENGTH
  );
  const ticketStaffUrl = `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/staff/tickets/${ticket.id}`;

  try {
    const config = await getTicketChannelNotificationConfig(templateId, {
      author: authorName,
      subject: ticket.subject,
      category: categoryLabel,
      description,
      ticketId: ticket.id,
      url: ticketStaffUrl,
    });

    if (!config.enabled) {
      return { success: true, discord: "disabled" };
    }

    const result = await notifyTicketTeamSummoned({
      team,
      channelId: config.channelId,
      mentionRoleId: config.mentionRoleId,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      ticketCategory: categoryLabel,
      authorName,
      ticketDescription: description,
      customTicketStaffUrl: ticketStaffUrl,
      override: config.override,
    });

    if (!result.success || result.notified === false) {
      console.warn(
        `[TicketNotification] Notification de convocation non envoyée (${team}):`,
        result.error
      );
      return { success: true, discord: "failed" };
    }

    return { success: true, discord: "sent" };
  } catch (err) {
    console.warn("[TicketNotification] Échec lors de la notification de convocation:", err);
    return { success: true, discord: "failed" };
  }
}

export async function addTicketStaffAccess(
  ticketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const staffUser = await requireRole(ticketStaffRoles);

  const [ticket, target] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
  ]);

  if (!ticket) {
    return { success: false, error: "Ticket introuvable." };
  }
  if (!target || !ticketSummonableTeams.includes(target.role)) {
    return { success: false, error: "Ce membre ne peut pas être ajouté à un ticket." };
  }

  await prisma.ticketStaffAccess.upsert({
    where: { ticketId_userId: { ticketId, userId } },
    update: {},
    create: { ticketId, userId, addedById: staffUser.id },
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");

  return { success: true };
}

export async function removeTicketStaffAccess(
  ticketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole(ticketStaffRoles);

  await prisma.ticketStaffAccess.deleteMany({ where: { ticketId, userId } });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");

  return { success: true };
}

export async function archiveTicket(ticketId: string) {
  const { ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) throw new Error("Ticket introuvable.");

  await prisma.ticket.update({
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
  const { ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) throw new Error("Ticket introuvable.");

  await prisma.ticket.update({
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
  const { ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) throw new Error("Ticket introuvable.");

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
  const { ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) throw new Error("Ticket introuvable.");

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

export async function markAllStaffTicketsAsRead(): Promise<{ success: boolean; count: number }> {
  const staffUser = await requireRole(allStaffRoles);

  const unreadTickets = await getUnreadTickets(staffUser);

  if (unreadTickets.length > 0) {
    const now = new Date();
    await Promise.all(
      unreadTickets.map((t) =>
        prisma.conversationRead.upsert({
          where: {
            conversationId_userId: {
              conversationId: t.conversationId,
              userId: staffUser.id,
            },
          },
          create: {
            conversationId: t.conversationId,
            userId: staffUser.id,
            lastReadAt: now,
          },
          update: {
            lastReadAt: now,
          },
        })
      )
    );
  }

  revalidatePath("/staff/tickets");
  revalidatePath("/staff");

  return { success: true, count: unreadTickets.length };
}

export async function setStaffTicketRead(
  ticketId: string,
  read: boolean
): Promise<{ success: boolean; error?: string }> {
  const { staffUser, ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) {
    return { success: false, error: "Ticket introuvable." };
  }

  const key = {
    conversationId_userId: {
      conversationId: ticket.conversationId,
      userId: staffUser.id,
    },
  };

  if (read) {
    const now = new Date();
    await prisma.conversationRead.upsert({
      where: key,
      create: { conversationId: ticket.conversationId, userId: staffUser.id, lastReadAt: now },
      update: { lastReadAt: now },
    });
  } else {
    await prisma.conversationRead.deleteMany({
      where: { conversationId: ticket.conversationId, userId: staffUser.id },
    });
  }

  revalidatePath("/staff/tickets");

  return { success: true };
}
