"use server";

import { revalidatePath } from "next/cache";
import { requireActivePlayer, requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { CharacterStatus, MessageAuthorType, Role } from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";
import { notifyPlayerRpTrackingMessage } from "@/lib/services/discord-bot-service";

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

  const { getGlobalSettings } = await import("@/lib/services/settings-service");
  const settings = await getGlobalSettings();
  if (!settings.rpTrackingAccessEnabled) {
    throw new Error("Un administrateur a désactivé l'accès au Suivi RP.");
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

  // Mettre à jour la date de lecture du joueur
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: message.createdAt },
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

  const now = new Date();

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.conversationMessage.create({
      data: {
        conversationId,
        authorId: staffUser.id,
        authorType: MessageAuthorType.STAFF,
        body: body?.trim() || null,
        imageUrl: imageUrl ?? null,
      },
      include: { author: true },
    });

    // Mettre à jour le suivi comme traité par le staff
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastHandledAt: now,
        lastHandledById: staffUser.id,
      },
    });

    // Enregistrer la lecture du staff
    await tx.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: staffUser.id,
        },
      },
      create: {
        conversationId,
        userId: staffUser.id,
        lastReadAt: now,
      },
      update: {
        lastReadAt: now,
      },
    });

    return newMessage;
  });

  publish(conversationId, serializeConversationMessage(message, true));

  // Déclencher la notification Discord vers le joueur avec protection anti-spam
  dispatchRpTrackingMessageNotifications({
    conversationId,
    newMessageId: message.id,
    authorName: "L'équipe staff",
    messageBody: message.body,
    hasImage: Boolean(message.imageUrl),
  }).catch((err) => {
    console.warn("[RpTrackingNotification] Échec lors de la notification Discord:", err);
  });

  revalidatePath("/staff/rp-tracking");
}

export async function markRpTrackingHandledAction(
  conversationId: string,
  handled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const staffUser = await requireRole(rpTrackingStaffRoles);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastHandledAt: handled ? new Date() : null,
        lastHandledById: handled ? staffUser.id : null,
      },
    });

    revalidatePath("/staff/rp-tracking");
    return { success: true };
  } catch (error) {
    console.error("[RpTrackingAction] Erreur lors du marquage comme traité:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

async function dispatchRpTrackingMessageNotifications({
  conversationId,
  newMessageId,
  authorName,
  messageBody,
  hasImage,
}: {
  conversationId: string;
  newMessageId: string;
  authorName: string;
  messageBody?: string | null;
  hasImage?: boolean;
}): Promise<void> {
  try {
    // Récupérer le membre joueur de ce suivi RP
    const playerMember = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        user: { role: Role.PLAYER },
      },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            characterSheets: {
              where: { status: CharacterStatus.ACTIVE },
              take: 1,
              select: { name: true },
            },
          },
        },
      },
    });

    if (!playerMember?.user.discordId) {
      return;
    }

    const lastReadThreshold = playerMember.lastReadAt ?? playerMember.joinedAt;

    // Vérifier si le joueur avait déjà des messages non lus antérieurs à ce nouveau message
    const priorUnreadMessage = await prisma.conversationMessage.findFirst({
      where: {
        conversationId,
        id: { not: newMessageId },
        deletedAt: null,
        authorId: { not: playerMember.userId },
        createdAt: { gt: lastReadThreshold },
      },
      select: { id: true },
    });

    // S'il n'avait aucun message non lu en attente, ce message est le premier de la salve : on notifie !
    if (!priorUnreadMessage) {
      const previewText = messageBody ? messageBody : hasImage ? "[Image partagée]" : null;
      const characterName = playerMember.user.characterSheets[0]?.name ?? null;

      await notifyPlayerRpTrackingMessage({
        discordId: playerMember.user.discordId,
        authorName,
        characterName,
        messagePreview: previewText,
      });
    }
  } catch (error) {
    console.warn(
      "[RpTrackingNotification] Erreur lors de l'envoi de la notification Discord:",
      error
    );
  }
}
