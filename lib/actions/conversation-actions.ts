"use server";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { MessageAuthorType, TicketStatus } from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";

export async function editConversationMessage(messageId: string, body: string): Promise<void> {
  const user = await requireActivePlayer();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Le message ne peut pas être vide.");
  }

  const message = await prisma.conversationMessage.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: {
          ticket: true,
        },
      },
      author: true,
    },
  });

  if (!message) {
    throw new Error("Message introuvable.");
  }

  if (message.authorType === MessageAuthorType.SYSTEM) {
    throw new Error("Les messages système ne peuvent pas être modifiés.");
  }

  if (message.authorId !== user.id) {
    throw new Error("Tu ne peux modifier que tes propres messages.");
  }

  if (message.conversation.ticket?.status === TicketStatus.ARCHIVED) {
    throw new Error("Ce ticket est archivé.");
  }

  const updated = await prisma.conversationMessage.update({
    where: { id: messageId },
    data: { body: trimmedBody },
    include: { author: true },
  });

  publish(message.conversationId, {
    type: "UPDATE",
    message: serializeConversationMessage(updated),
  });
}

export async function deleteConversationMessage(messageId: string): Promise<void> {
  const user = await requireActivePlayer();

  const message = await prisma.conversationMessage.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: {
          ticket: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error("Message introuvable.");
  }

  if (message.authorType === MessageAuthorType.SYSTEM) {
    throw new Error("Les messages système ne peuvent pas être supprimés.");
  }

  if (message.authorId !== user.id) {
    throw new Error("Tu ne peux supprimer que tes propres messages.");
  }

  if (message.conversation.ticket?.status === TicketStatus.ARCHIVED) {
    throw new Error("Ce ticket est archivé.");
  }

  await prisma.conversationMessage.delete({
    where: { id: messageId },
  });

  publish(message.conversationId, {
    type: "DELETE",
    messageId: message.id,
    conversationId: message.conversationId,
  });
}
