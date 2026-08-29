"use server";

import { requireActivePlayer, requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { MessageAuthorType } from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";

function assertHasContent(body: string | undefined, imageUrl: string | undefined) {
  if (!body?.trim() && !imageUrl) {
    throw new Error("Le message ne peut pas être vide.");
  }
}

export async function sendConversationMessage(
  conversationId: string,
  body?: string,
  imageUrl?: string
): Promise<void> {
  const user = await requireActivePlayer();

  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("Tu n'as pas accès à cette conversation.");
  }

  assertHasContent(body, imageUrl);

  const message = await prisma.conversationMessage.create({
    data: {
      conversationId,
      authorId: user.id,
      authorType: MessageAuthorType.PLAYER,
      body: body?.trim() || null,
      imageUrl: imageUrl ?? null,
    },
    include: { author: true },
  });

  publish(conversationId, serializeConversationMessage(message));
}

export async function sendStaffConversationMessage(
  conversationId: string,
  body?: string,
  imageUrl?: string
): Promise<void> {
  const staffUser = await requireRole(rpTrackingStaffRoles);
  assertHasContent(body, imageUrl);

  const message = await prisma.$transaction(async (tx) => {
    return await tx.conversationMessage.create({
      data: {
        conversationId,
        authorId: staffUser.id,
        authorType: MessageAuthorType.STAFF,
        body: body?.trim() || null,
        imageUrl: imageUrl ?? null,
      },
      include: { author: true },
    });
  });

  publish(conversationId, serializeConversationMessage(message));
}
