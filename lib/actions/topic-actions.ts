"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { allStaffRoles } from "@/lib/navigation";
import { MessageAuthorType } from "@/lib/generated/prisma/enums";
import {
  archiveDiscordTopic,
  createDiscordTopic,
  getAtlasBaseUrl,
} from "@/lib/services/discord-bot-service";
import { publish } from "@/lib/services/conversation-events";
import { serializeConversationMessage } from "@/lib/conversation";
import { slugifyTopic } from "@/lib/topic-constants";

export interface CreateStaffTopicInput {
  title: string;
  slug?: string;
  context: string;
  actions: string;
  ticketId?: string | null;
}

export async function createStaffTopicAction(input: CreateStaffTopicInput) {
  const staffUser = await requireRole(allStaffRoles);

  const trimmedTitle = input.title?.trim();
  const trimmedContext = input.context?.trim();
  const trimmedActions = input.actions?.trim();

  if (!trimmedTitle) {
    return { success: false, error: "Le titre du sujet est obligatoire." };
  }
  if (!trimmedContext) {
    return { success: false, error: "Le contexte est obligatoire." };
  }
  if (!trimmedActions) {
    return { success: false, error: "Les actions à entreprendre sont obligatoires." };
  }

  const finalSlug = slugifyTopic(input.slug?.trim() || trimmedTitle);

  let ticket = null;
  let ticketUrl: string | null = null;

  if (input.ticketId) {
    ticket = await prisma.ticket.findUnique({
      where: { id: input.ticketId },
      select: { id: true, subject: true, conversationId: true },
    });

    if (!ticket) {
      return { success: false, error: "Le ticket associé est introuvable." };
    }

    ticketUrl = `${getAtlasBaseUrl()}/staff/tickets/${ticket.id}`;
  }

  // 1. Appel au bot Discord pour créer le salon dans la catégorie active
  const botResult = await createDiscordTopic({
    title: trimmedTitle,
    slug: finalSlug,
    context: trimmedContext,
    actions: trimmedActions,
    ticketId: ticket?.id ?? null,
    ticketSubject: ticket?.subject ?? null,
    ticketUrl,
  });

  if (!botResult.success || !botResult.channelId) {
    return {
      success: false,
      error: botResult.error || "Impossible de créer le salon Discord sur le serveur staff.",
    };
  }

  // 2. Enregistrement en base de données
  const topic = await prisma.staffTopic.create({
    data: {
      title: trimmedTitle,
      slug: botResult.slug || finalSlug,
      context: trimmedContext,
      actions: trimmedActions,
      channelId: botResult.channelId,
      channelUrl: botResult.channelUrl,
      ticketId: ticket?.id ?? null,
      createdById: staffUser.id,
    },
    include: {
      createdBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
        },
      },
    },
  });

  // 3. Si le sujet est lié à un ticket, publier un message système dans la conversation du ticket
  if (ticket) {
    try {
      const channelLink = botResult.channelUrl
        ? `[#${topic.slug}](${botResult.channelUrl})`
        : `#${topic.slug}`;

      const systemMsg = await prisma.conversationMessage.create({
        data: {
          conversationId: ticket.conversationId,
          authorType: MessageAuthorType.SYSTEM,
          body: `💬 Sujet ouvert · ${channelLink}`,
        },
        include: { author: true },
      });

      publish(ticket.conversationId, serializeConversationMessage(systemMsg, true));
    } catch (err) {
      console.warn(
        "[StaffTopic] Impossible d'envoyer le message système de sujet dans le ticket:",
        err
      );
    }

    revalidatePath(`/staff/tickets/${ticket.id}`);
  }

  revalidatePath("/staff/tickets");

  return { success: true, data: topic };
}

export async function archiveStaffTopicAction(topicId: string) {
  const staffUser = await requireRole(allStaffRoles);

  const topic = await prisma.staffTopic.findUnique({
    where: { id: topicId },
    include: {
      ticket: {
        select: { id: true, conversationId: true },
      },
    },
  });

  if (!topic) {
    return { success: false, error: "Sujet introuvable." };
  }

  if (topic.isArchived) {
    return { success: true, message: "Le sujet est déjà archivé." };
  }

  // 1. Déplacer le salon sur Discord via le bot
  const botResult = await archiveDiscordTopic(topic.channelId);
  if (!botResult.success) {
    return {
      success: false,
      error: botResult.error || "Impossible d'archiver le salon sur Discord.",
    };
  }

  // 2. Mettre à jour en base de données
  const updatedTopic = await prisma.staffTopic.update({
    where: { id: topicId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  // 3. Message système dans le ticket si lié
  if (topic.ticket) {
    try {
      const systemMsg = await prisma.conversationMessage.create({
        data: {
          conversationId: topic.ticket.conversationId,
          authorType: MessageAuthorType.SYSTEM,
          body: `🔒 Sujet fermé · #${topic.slug}`,
        },
        include: { author: true },
      });

      publish(topic.ticket.conversationId, serializeConversationMessage(systemMsg, true));
    } catch (err) {
      console.warn("[StaffTopic] Échec de l'envoi du message d'archivage:", err);
    }

    revalidatePath(`/staff/tickets/${topic.ticket.id}`);
  }

  revalidatePath("/staff/tickets");

  return { success: true, data: updatedTopic };
}
