"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer, requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { allStaffRoles, secretTicketStaffRoles, ticketSummonableTeams } from "@/lib/navigation";
import { getUnreadTickets, hasFullTicketAccess, ticketAccessWhere } from "@/lib/ticket-access";
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
import {
  getEffectiveDiscordOverride,
  getTicketChannelNotificationConfig,
} from "@/lib/services/discord-template-service";
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
  isSpoiler?: boolean;
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
  let isSpoiler = false;
  let subject = "";
  let description = "";

  if (typeof categoryOrInput === "object" && categoryOrInput !== null) {
    categoryId = categoryOrInput.categoryId;
    subcategoryId = categoryOrInput.subcategoryId;
    isSpoiler = Boolean(categoryOrInput.isSpoiler);
    subject = categoryOrInput.subject;
    description = categoryOrInput.description;
  } else {
    subject = maybeSubject ?? "";
    description = maybeDescription ?? "";
    if (categoryOrInput === TicketCategory.SECRET) {
      isSpoiler = true;
    }
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

  if (categoryConfig && !categoryConfig.allowSpoiler) {
    isSpoiler = false;
  }

  const categoryName = categoryConfig?.name ?? "Roleplay";
  const subcategoryName =
    subcategoryConfig?.name ??
    (categoryConfig?.slug === "technique" ? "Report de bug" : "Demande suivi RP");
  const isTechnique = categoryConfig?.slug === "technique";
  const legacyCategory = isSpoiler ? TicketCategory.SECRET : TicketCategory.OPEN;

  // Create the conversation, the conversation members, the messages, and the ticket all at once
  const ticket = await prisma.ticket.create({
    data: {
      player: { connect: { id: user.id } },
      category: legacyCategory,
      categoryRef: categoryConfig?.id ? { connect: { id: categoryConfig.id } } : undefined,
      subcategoryRef: subcategoryConfig?.id ? { connect: { id: subcategoryConfig.id } } : undefined,
      categoryName,
      subcategoryName,
      isSpoiler,
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
                body: isSpoiler
                  ? `🔒 Ticket spoiler créé par ${user.minecraftUsername ?? user.discordUsername ?? "un joueur"} (réservé aux intrigues sensibles, RPK/captures, et accessible uniquement aux Administrateurs et au Suivi RP).`
                  : `Ticket créé par ${user.minecraftUsername ?? user.discordUsername ?? "un joueur"} (${categoryName}${subcategoryName ? ` · ${subcategoryName}` : ""}).`,
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

  // Déclencher la notification Discord d'ouverture de ticket (salon RP, salon RP spoiler ou salon Technique)
  let templateId: DiscordTemplateId;
  if (isTechnique) {
    templateId = "TICKET_TECH_CREATED";
  } else if (isSpoiler) {
    templateId = "TICKET_RP_SPOILER_CREATED";
  } else {
    templateId = "TICKET_RP_CREATED";
  }

  const categoryLabel = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
  const authorName =
    user.minecraftUsername ?? user.discordDisplayName ?? user.discordUsername ?? "Un joueur";
  const ticketStaffUrl = `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/staff/tickets/${ticket.id}`;

  getTicketChannelNotificationConfig(templateId, {
    author: authorName,
    subject: trimmedSubject,
    category: categoryLabel,
    description: trimmedDescription.slice(0, BOT_TICKET_DESCRIPTION_MAX_LENGTH),
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
          ticketCategory: isSpoiler ? `${categoryLabel} (Spoiler)` : categoryLabel,
          authorName,
          ticketDescription: trimmedDescription.slice(0, BOT_TICKET_DESCRIPTION_MAX_LENGTH),
          customTicketStaffUrl: ticketStaffUrl,
          override: config.override,
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
  isSpoiler?: boolean;
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
      where: { slug: "rp" },
    });
  }

  if (input.subcategoryId) {
    subcategoryConfig = await prisma.ticketSubcategoryConfig.findUnique({
      where: { id: input.subcategoryId },
    });
  }

  const isSpoiler = Boolean(input.isSpoiler || input.category === TicketCategory.SECRET);
  const categoryName = categoryConfig?.name ?? "Roleplay";
  const subcategoryName = subcategoryConfig?.name ?? null;
  const legacyCategory = isSpoiler ? TicketCategory.SECRET : TicketCategory.OPEN;

  const now = new Date();
  const ticket = await prisma.ticket.create({
    data: {
      player: { connect: { id: player.id } },
      category: legacyCategory,
      categoryRef: categoryConfig?.id ? { connect: { id: categoryConfig.id } } : undefined,
      subcategoryRef: subcategoryConfig?.id ? { connect: { id: subcategoryConfig.id } } : undefined,
      categoryName,
      subcategoryName,
      isSpoiler,
      subject,
      status: TicketStatus.PENDING_PLAYER,
      lastMessageAt: now,
      // Un staff sans accès complet garde la main sur le ticket qu'il vient d'ouvrir.
      staffAccesses: hasFullTicketAccess(staffUser.role)
        ? undefined
        : { create: [{ userId: staffUser.id, addedById: staffUser.id }] },
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
    getEffectiveDiscordOverride("TICKET_MESSAGE", {
      author: authorName,
      subject,
      preview: message,
      url: `${process.env.NEXTAUTH_URL ?? "https://hyori-rp.fr"}/player/tickets/${ticket.id}`,
    })
      .catch(() => null)
      .then((override) =>
        notifyPlayerTicketMessage({
          discordId,
          ticketId: ticket.id,
          ticketSubject: subject,
          authorName,
          messagePreview: message,
          override: override ?? undefined,
        })
      )
      .catch((err) => {
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

export async function setTicketTeamSummon(
  ticketId: string,
  team: Role,
  summoned: boolean
): Promise<{
  success: boolean;
  error?: string;
  discord?: "sent" | "failed" | "disabled";
}> {
  const staffUser = await requireRole(allStaffRoles);

  if (!ticketSummonableTeams.includes(team)) {
    return { success: false, error: "Cette équipe ne peut pas être convoquée." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
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

  return { success: true };
}

export async function addTicketStaffAccess(
  ticketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const staffUser = await requireRole(allStaffRoles);

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
  await requireRole(allStaffRoles);

  await prisma.ticketStaffAccess.deleteMany({ where: { ticketId, userId } });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");

  return { success: true };
}

export async function toggleTicketSecrecy(ticketId: string): Promise<{
  success: boolean;
  isSecret: boolean;
  isSpoiler?: boolean;
  error?: string;
}> {
  await requireRole(secretTicketStaffRoles);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, category: true, isSpoiler: true, conversationId: true },
  });

  if (!ticket) {
    return { success: false, isSecret: false, error: "Ticket introuvable." };
  }

  const nextIsSpoiler = !ticket.isSpoiler;
  const nextCategory = nextIsSpoiler ? TicketCategory.SECRET : TicketCategory.OPEN;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        isSpoiler: nextIsSpoiler,
        category: nextCategory,
      },
    });

    const systemMessage = await tx.conversationMessage.create({
      data: {
        conversationId: ticket.conversationId,
        authorType: MessageAuthorType.SYSTEM,
        body: nextIsSpoiler
          ? `🔒 Ce ticket a été requalifié en ticket spoiler/confidentiel (réservé aux Administrateurs et au Suivi RP).`
          : `🔓 Ce ticket a été retiré des tickets spoiler (accessible selon les permissions normales de la catégorie).`,
      },
      include: { author: true },
    });

    publish(ticket.conversationId, serializeConversationMessage(systemMessage, true));
  });

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/tickets");
  revalidatePath(`/player/tickets/${ticketId}`);
  revalidatePath("/player/tickets");

  return { success: true, isSecret: nextIsSpoiler, isSpoiler: nextIsSpoiler };
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
