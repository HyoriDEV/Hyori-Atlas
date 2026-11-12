"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer, requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { allStaffRoles, formatTicketCategoryName, isTechniqueCategory } from "@/lib/navigation";
import { getUnreadTickets, ticketAccessWhere } from "@/lib/ticket-access";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";
import {
  ConversationType,
  MessageAuthorType,
  RegistrationStatus,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";
import {
  archiveDiscordTopic,
  notifyPlayerTicketMessage,
  notifyTicketCreated,
} from "@/lib/services/discord-bot-service";
import { getTicketChannelNotificationConfig } from "@/lib/services/discord-template-service";
import type { DiscordTemplateId } from "@/lib/discord-template-constants";

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

import { TICKET_SUBJECT_MAX_LENGTH } from "@/lib/ticket-constants";

export interface CreatePlayerTicketInput {
  categoryId?: string;
  subcategoryId?: string;
  subject: string;
  description: string;
}

export async function createTicket(
  categoryOrInput: TicketCategory | string | CreatePlayerTicketInput,
  maybeSubject?: string,
  maybeDescription?: string
) {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  if (!settings.ticketCreationEnabled) {
    throw new Error("Un administrateur a désactivé l'ouverture de tickets.");
  }

  let categoryId: string | undefined;
  let subcategoryId: string | undefined;
  let subject = "";
  let description = "";

  if (typeof categoryOrInput === "object" && categoryOrInput !== null) {
    categoryId = categoryOrInput.categoryId;
    subcategoryId = categoryOrInput.subcategoryId;
    subject = categoryOrInput.subject;
    description = categoryOrInput.description;
  } else {
    subject = maybeSubject ?? "";
    description = maybeDescription ?? "";
  }

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();

  if (!trimmedSubject || !trimmedDescription) {
    throw new Error("Le sujet et la description sont requis.");
  }

  if (trimmedSubject.length > TICKET_SUBJECT_MAX_LENGTH) {
    throw new Error(
      `L'intitulé du ticket ne peut pas dépasser ${TICKET_SUBJECT_MAX_LENGTH} caractères.`
    );
  }

  let categoryConfig = null;
  let subcategoryConfig = null;

  if (categoryId) {
    categoryConfig = await prisma.ticketCategoryConfig.findUnique({
      where: { id: categoryId },
    });
  } else {
    categoryConfig = await prisma.ticketCategoryConfig.findFirst({
      where: { slug: "rp" },
    });
  }

  if (subcategoryId) {
    subcategoryConfig = await prisma.ticketSubcategoryConfig.findUnique({
      where: { id: subcategoryId },
    });
  }

  const isTechnique = isTechniqueCategory(categoryConfig);
  const categoryName = categoryConfig?.name
    ? formatTicketCategoryName(categoryConfig.name)
    : isTechnique
      ? "Ticket technique"
      : "Ticket RP";
  const subcategoryName =
    subcategoryConfig?.name ?? (isTechnique ? "Report de bug" : "Demande suivi RP");
  const ticketCategory = isTechnique ? TicketCategory.TECHNIQUE : TicketCategory.RP;

  // Create the conversation, the conversation members, the messages, and the ticket all at once
  const ticket = await prisma.ticket.create({
    data: {
      player: { connect: { id: user.id } },
      category: ticketCategory,
      categoryRef: categoryConfig?.id ? { connect: { id: categoryConfig.id } } : undefined,
      subcategoryRef: subcategoryConfig?.id ? { connect: { id: subcategoryConfig.id } } : undefined,
      categoryName,
      subcategoryName,
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
                body: `Ticket créé par ${user.minecraftUsername ?? user.discordUsername ?? "un joueur"} (${categoryName}${subcategoryName ? ` · ${subcategoryName}` : ""}).`,
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

  // Déclencher la notification Discord d'ouverture de ticket (salon RP ou salon Technique)
  const templateId: DiscordTemplateId = isTechnique ? "TICKET_TECH_CREATED" : "TICKET_RP_CREATED";

  const categoryLabel = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
  const authorName =
    user.minecraftUsername ?? user.discordDisplayName ?? user.discordUsername ?? "Un joueur";
  const ticketStaffUrl = `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/staff/tickets/${ticket.id}`;

  getTicketChannelNotificationConfig(templateId)
    .then((config) => {
      if (config.enabled) {
        return notifyTicketCreated({
          channelId: config.channelId,
          mentionRoleId: config.mentionRoleId,
          discordId: user.discordId,
          avatarUrl: user.discordAvatarUrl,
          ticketId: ticket.id,
          ticketSubject: trimmedSubject,
          ticketCategory: categoryLabel,
          authorName,
          ticketDescription: trimmedDescription.slice(0, BOT_TICKET_DESCRIPTION_MAX_LENGTH),
          customTicketStaffUrl: ticketStaffUrl,
        });
      }
    })
    .catch((err) => {
      console.warn(
        `[TicketNotification] Échec lors de la notification d'ouverture de ticket (${templateId}):`,
        err
      );
    });

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");
  return { id: ticket.id };
}

/** Le staff peut-il ouvrir un ticket lui-même ? Tous les membres du staff peuvent ouvrir un ticket. */
function canStaffOpenTicket(role: Role): boolean {
  return allStaffRoles.includes(role);
}

/**
 * Ouvre un ticket à l'initiative du staff pour contacter un joueur. Le ticket appartient au
 * joueur (il le voit dans son espace comme s'il l'avait ouvert), le premier message est un
 * message staff (anonymisé côté joueur) et le ticket attend la réponse du joueur.
 */
export async function createStaffTicket(input: {
  playerId: string;
  category?: TicketCategory;
  categoryId?: string;
  subcategoryId?: string;
  subject: string;
  message: string;
}): Promise<{ id: string }> {
  const staffUser = await requireRole(allStaffRoles);
  if (!canStaffOpenTicket(staffUser.role)) {
    throw new Error("Ton rôle ne permet pas d'ouvrir un ticket.");
  }

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || !message) {
    throw new Error("Le sujet et le message sont requis.");
  }

  if (subject.length > TICKET_SUBJECT_MAX_LENGTH) {
    throw new Error(
      `L'intitulé du ticket ne peut pas dépasser ${TICKET_SUBJECT_MAX_LENGTH} caractères.`
    );
  }

  const player = await prisma.user.findUnique({
    where: { id: input.playerId },
    select: { id: true, role: true, registrationStatus: true, discordId: true },
  });
  if (!player || player.role !== Role.PLAYER) {
    throw new Error("Joueur introuvable.");
  }
  if (player.registrationStatus === RegistrationStatus.REJECTED) {
    // Un joueur refusé est redirigé hors de son espace : il ne pourrait pas répondre.
    throw new Error("Ce joueur a été refusé : il n'a plus accès aux tickets.");
  }

  let categoryConfig = null;
  let subcategoryConfig = null;

  if (input.categoryId) {
    categoryConfig = await prisma.ticketCategoryConfig.findUnique({
      where: { id: input.categoryId },
    });
  } else {
    categoryConfig = await prisma.ticketCategoryConfig.findFirst({
      where: { slug: input.category === TicketCategory.TECHNIQUE ? "technique" : "rp" },
    });
  }

  if (input.subcategoryId) {
    subcategoryConfig = await prisma.ticketSubcategoryConfig.findUnique({
      where: { id: input.subcategoryId },
    });
  }

  const isTechnique =
    input.category === TicketCategory.TECHNIQUE || isTechniqueCategory(categoryConfig);
  const categoryName = categoryConfig?.name
    ? formatTicketCategoryName(categoryConfig.name)
    : isTechnique
      ? "Ticket technique"
      : "Ticket RP";
  const subcategoryName = subcategoryConfig?.name ?? null;
  const ticketCategory = isTechnique ? TicketCategory.TECHNIQUE : TicketCategory.RP;

  const now = new Date();
  const ticket = await prisma.ticket.create({
    data: {
      player: { connect: { id: player.id } },
      category: ticketCategory,
      categoryRef: categoryConfig?.id ? { connect: { id: categoryConfig.id } } : undefined,
      subcategoryRef: subcategoryConfig?.id ? { connect: { id: subcategoryConfig.id } } : undefined,
      categoryName,
      subcategoryName,
      subject,
      status: TicketStatus.PENDING_PLAYER,
      lastMessageAt: now,
      conversation: {
        create: {
          type: ConversationType.TICKET,
          members: {
            create: [{ userId: player.id }],
          },
          reads: {
            create: [{ userId: staffUser.id, lastReadAt: now }],
          },
          messages: {
            create: [
              {
                authorType: MessageAuthorType.SYSTEM,
                body: "Ticket ouvert par l'équipe staff.",
                createdAt: now,
              },
              {
                authorType: MessageAuthorType.STAFF,
                authorId: staffUser.id,
                body: message,
                createdAt: now,
              },
            ],
          },
        },
      },
    },
    select: { id: true },
  });

  // MP Discord au joueur (même gabarit qu'une réponse staff).
  if (player.discordId) {
    const discordId = player.discordId;
    const authorName = "L'équipe staff";
    notifyPlayerTicketMessage({
      discordId,
      ticketId: ticket.id,
      ticketSubject: subject,
      authorName,
      messagePreview: message,
    }).catch((err) => {
      console.warn("[TicketNotification] Échec de la notification d'un ticket staff:", err);
    });
  }

  revalidatePath("/player/tickets");
  revalidatePath("/staff/tickets");
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

export async function archiveTicket(ticketId: string) {
  const { ticket } = await findAccessibleTicket(ticketId);
  if (!ticket) throw new Error("Ticket introuvable.");

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.ARCHIVED },
  });

  // Archiver automatiquement les éventuels sujets staff Discord actifs liés
  try {
    const activeTopics = await prisma.staffTopic.findMany({
      where: { ticketId, isArchived: false },
      select: { id: true, channelId: true, slug: true },
    });
    for (const topic of activeTopics) {
      await archiveDiscordTopic(topic.channelId).catch((err) =>
        console.warn(`[StaffTopic] Échec archivage Discord #${topic.slug}:`, err)
      );
      await prisma.staffTopic.update({
        where: { id: topic.id },
        data: { isArchived: true, archivedAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[StaffTopic] Erreur lors de l'archivage automatique des sujets du ticket:", err);
  }

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

export async function deleteTicket(ticketId: string) {
  await requireRole([Role.ADMIN]);

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, conversationId: true },
  });

  if (!ticket) {
    throw new Error("Ticket introuvable.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.delete({ where: { id: ticketId } });
    await tx.conversation.delete({ where: { id: ticket.conversationId } });
  });

  revalidatePath("/staff/tickets");
  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/player/tickets");
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/staff/backlog");
  revalidatePath("/staff");

  return { success: true };
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

/**
 * Permet au staff de modifier les catégories d'un ticket depuis sa page,
 * qu'il soit archivé ou non.
 */
export async function updateTicketCategories(input: {
  ticketId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const staffUser = await requireUser();
  if (!allStaffRoles.includes(staffUser.role)) {
    throw new Error("Action réservée au staff.");
  }

  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: input.ticketId }, ticketAccessWhere(staffUser)] },
    include: {
      categoryRef: true,
      subcategoryRef: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket introuvable ou accès refusé.");
  }

  // NOTE: On autorise explicitement la modification qu'il soit archivé ou non.

  let categoryConfig = null;
  let subcategoryConfig = null;

  if (input.categoryId) {
    categoryConfig = await prisma.ticketCategoryConfig.findUnique({
      where: { id: input.categoryId },
    });
  }

  if (input.subcategoryId) {
    subcategoryConfig = await prisma.ticketSubcategoryConfig.findUnique({
      where: { id: input.subcategoryId },
    });
  }

  if (
    subcategoryConfig &&
    (!categoryConfig || categoryConfig.id !== subcategoryConfig.categoryId)
  ) {
    categoryConfig = await prisma.ticketCategoryConfig.findUnique({
      where: { id: subcategoryConfig.categoryId },
    });
  }

  const isTechnique = isTechniqueCategory(categoryConfig);
  const categoryName = categoryConfig?.name
    ? formatTicketCategoryName(categoryConfig.name)
    : isTechnique
      ? "Ticket technique"
      : "Ticket RP";
  const subcategoryName = subcategoryConfig?.name ?? null;
  const ticketCategory = isTechnique ? TicketCategory.TECHNIQUE : TicketCategory.RP;

  const previousCategoryLabel = ticket.subcategoryName
    ? `${formatTicketCategoryName(ticket.categoryName)} · ${ticket.subcategoryName}`
    : formatTicketCategoryName(ticket.categoryName);
  const newCategoryLabel = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;

  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: {
      category: ticketCategory,
      categoryId: categoryConfig?.id ?? null,
      subcategoryId: subcategoryConfig?.id ?? null,
      categoryName,
      subcategoryName,
    },
  });

  if (previousCategoryLabel !== newCategoryLabel) {
    const staffName =
      staffUser.minecraftUsername ?? staffUser.discordDisplayName ?? "Un membre du staff";
    try {
      const systemMessage = await prisma.conversationMessage.create({
        data: {
          conversationId: ticket.conversationId,
          authorId: staffUser.id,
          authorType: MessageAuthorType.SYSTEM,
          body: `Catégorie du ticket mise à jour par ${staffName} : ${newCategoryLabel} (auparavant ${previousCategoryLabel}).`,
        },
        include: { author: true },
      });
      publish(ticket.conversationId, serializeConversationMessage(systemMessage, true));
    } catch (msgErr) {
      console.warn("[updateTicketCategories] Erreur lors de l'envoi du message système:", msgErr);
    }
  }

  revalidatePath(`/staff/tickets/${input.ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/player/tickets/${input.ticketId}`);
  revalidatePath("/player/tickets");

  return { success: true };
}
