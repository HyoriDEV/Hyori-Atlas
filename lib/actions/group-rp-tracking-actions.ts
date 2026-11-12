"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import {
  CharacterStatus,
  ConversationType,
  MessageAuthorType,
  RegistrationStatus,
  SanctionType,
} from "@/lib/generated/prisma/enums";
import { serializeConversationMessage } from "@/lib/conversation";
import { publish } from "@/lib/services/conversation-events";

const TITLE_MAX_LENGTH = 120;

export async function createRpTrackingGroupAction(input: {
  name: string;
  description?: string;
  memberUserIds: string[];
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const staffUser = await requireRole(rpTrackingStaffRoles);

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Le nom du groupe est obligatoire." };
    }
    if (trimmedName.length > TITLE_MAX_LENGTH) {
      return {
        success: false,
        error: `Le nom du groupe ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`,
      };
    }

    const uniqueMemberIds = Array.from(new Set(input.memberUserIds)).filter(Boolean);

    // Vérifier les joueurs sélectionnés
    const validPlayers = await prisma.user.findMany({
      where: {
        id: { in: uniqueMemberIds },
        registrationStatus: RegistrationStatus.WHITELISTED,
        sanctions: {
          none: {
            type: SanctionType.EXCLUSION,
            revokedAt: null,
          },
        },
      },
      include: {
        characterSheets: {
          where: { status: CharacterStatus.ACTIVE },
          take: 1,
          select: { id: true },
        },
      },
    });

    const group = await prisma.$transaction(async (tx) => {
      // 1. Créer la conversation de groupe
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.RP_TRACKING,
          members: {
            create: validPlayers.map((p) => ({
              userId: p.id,
            })),
          },
        },
      });

      // 2. Créer l'entité RpTrackingGroup
      const newGroup = await tx.rpTrackingGroup.create({
        data: {
          name: trimmedName,
          description: input.description?.trim() || null,
          conversationId: conversation.id,
          createdById: staffUser.id,
          members: {
            create: validPlayers.map((p) => ({
              userId: p.id,
              characterSheetId: p.characterSheets[0]?.id ?? null,
            })),
          },
        },
      });

      // 3. Message système initial
      await tx.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          authorType: MessageAuthorType.SYSTEM,
          body: `Groupe de suivi RP « ${trimmedName} » créé par ${staffUser.minecraftUsername ?? staffUser.discordDisplayName}.`,
        },
      });

      return newGroup;
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath("/player/rp-tracking");

    return { success: true, groupId: group.id };
  } catch (error) {
    console.error("[createRpTrackingGroupAction] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

export async function updateRpTrackingGroupAction(input: {
  groupId: string;
  name: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(rpTrackingStaffRoles);

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Le nom du groupe est obligatoire." };
    }
    if (trimmedName.length > TITLE_MAX_LENGTH) {
      return {
        success: false,
        error: `Le nom du groupe ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`,
      };
    }

    await prisma.rpTrackingGroup.update({
      where: { id: input.groupId },
      data: {
        name: trimmedName,
        description: input.description?.trim() || null,
      },
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath(`/staff/rp-tracking/groups/${input.groupId}`);
    revalidatePath("/player/rp-tracking");

    return { success: true };
  } catch (error) {
    console.error("[updateRpTrackingGroupAction] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

export async function deleteRpTrackingGroupAction(
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(rpTrackingStaffRoles);

    const group = await prisma.rpTrackingGroup.findUnique({
      where: { id: groupId },
      select: { conversationId: true },
    });

    if (!group) {
      return { success: false, error: "Groupe introuvable." };
    }

    // Supprimer le groupe et sa conversation associée
    await prisma.$transaction(async (tx) => {
      await tx.rpTrackingGroup.delete({
        where: { id: groupId },
      });
      await tx.conversation.delete({
        where: { id: group.conversationId },
      });
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath("/player/rp-tracking");

    return { success: true };
  } catch (error) {
    console.error("[deleteRpTrackingGroupAction] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

export async function addRpTrackingGroupMemberAction(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(rpTrackingStaffRoles);

    const group = await prisma.rpTrackingGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!group) {
      return { success: false, error: "Groupe introuvable." };
    }

    if (group.members.length > 0) {
      return { success: false, error: "Ce joueur est déjà membre du groupe." };
    }

    const player = await prisma.user.findFirst({
      where: {
        id: userId,
        registrationStatus: RegistrationStatus.WHITELISTED,
        sanctions: {
          none: {
            type: SanctionType.EXCLUSION,
            revokedAt: null,
          },
        },
      },
      include: {
        characterSheets: {
          where: { status: CharacterStatus.ACTIVE },
          take: 1,
          select: { id: true, name: true },
        },
      },
    });

    if (!player) {
      return { success: false, error: "Joueur non whitelisté ou introuvable." };
    }

    const playerName = player.minecraftUsername ?? player.discordDisplayName;

    await prisma.$transaction(async (tx) => {
      // 1. Ajouter comme membre du groupe
      await tx.rpTrackingGroupMember.create({
        data: {
          groupId,
          userId,
          characterSheetId: player.characterSheets[0]?.id ?? null,
        },
      });

      // 2. Ajouter comme membre de la conversation
      await tx.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: group.conversationId,
            userId,
          },
        },
        create: {
          conversationId: group.conversationId,
          userId,
        },
        update: {},
      });

      // 3. Message système
      const sysMsg = await tx.conversationMessage.create({
        data: {
          conversationId: group.conversationId,
          authorType: MessageAuthorType.SYSTEM,
          body: `${playerName} a rejoint le groupe de suivi RP.`,
        },
        include: { author: true },
      });

      publish(group.conversationId, serializeConversationMessage(sysMsg));
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath(`/staff/rp-tracking/groups/${groupId}`);
    revalidatePath("/player/rp-tracking");

    return { success: true };
  } catch (error) {
    console.error("[addRpTrackingGroupMemberAction] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

export async function removeRpTrackingGroupMemberAction(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(rpTrackingStaffRoles);

    const group = await prisma.rpTrackingGroup.findUnique({
      where: { id: groupId },
      select: { conversationId: true },
    });

    if (!group) {
      return { success: false, error: "Groupe introuvable." };
    }

    const player = await prisma.user.findUnique({
      where: { id: userId },
      select: { minecraftUsername: true, discordDisplayName: true },
    });

    const playerName = player
      ? (player.minecraftUsername ?? player.discordDisplayName)
      : "Un joueur";

    await prisma.$transaction(async (tx) => {
      await tx.rpTrackingGroupMember.deleteMany({
        where: { groupId, userId },
      });

      await tx.conversationMember.deleteMany({
        where: {
          conversationId: group.conversationId,
          userId,
        },
      });

      const sysMsg = await tx.conversationMessage.create({
        data: {
          conversationId: group.conversationId,
          authorType: MessageAuthorType.SYSTEM,
          body: `${playerName} a quitté le groupe de suivi RP.`,
        },
        include: { author: true },
      });

      publish(group.conversationId, serializeConversationMessage(sysMsg));
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath(`/staff/rp-tracking/groups/${groupId}`);
    revalidatePath("/player/rp-tracking");

    return { success: true };
  } catch (error) {
    console.error("[removeRpTrackingGroupMemberAction] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}
