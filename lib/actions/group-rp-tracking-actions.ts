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

export async function addRpTrackingGroupMembersAction(
  groupId: string,
  userIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireRole(rpTrackingStaffRoles);

    const group = await prisma.rpTrackingGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (!group) {
      return { success: false, error: "Groupe introuvable." };
    }

    const currentMemberIds = new Set(group.members.map((m) => m.userId));
    const targetUserIds = Array.from(new Set(userIds)).filter(
      (id) => Boolean(id) && !currentMemberIds.has(id)
    );

    if (targetUserIds.length === 0) {
      return {
        success: false,
        error: "Tous les joueurs sélectionnés sont déjà membres du groupe.",
      };
    }

    const validPlayers = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
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

    if (validPlayers.length === 0) {
      return { success: false, error: "Aucun joueur whitelisté valide à ajouter." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Ajouter comme membres du groupe
      await tx.rpTrackingGroupMember.createMany({
        data: validPlayers.map((player) => ({
          groupId,
          userId: player.id,
          characterSheetId: player.characterSheets[0]?.id ?? null,
        })),
        skipDuplicates: true,
      });

      // 2. Ajouter comme membres de la conversation
      for (const player of validPlayers) {
        await tx.conversationMember.upsert({
          where: {
            conversationId_userId: {
              conversationId: group.conversationId,
              userId: player.id,
            },
          },
          create: {
            conversationId: group.conversationId,
            userId: player.id,
          },
          update: {},
        });
      }

      // 3. Message système
      const names = validPlayers.map((p) => p.minecraftUsername ?? p.discordDisplayName);
      const text =
        names.length === 1
          ? `${names[0]} a rejoint le groupe de suivi RP.`
          : `${names.join(", ")} ont rejoint le groupe de suivi RP.`;

      const sysMsg = await tx.conversationMessage.create({
        data: {
          conversationId: group.conversationId,
          authorType: MessageAuthorType.SYSTEM,
          body: text,
        },
        include: { author: true },
      });

      publish(group.conversationId, serializeConversationMessage(sysMsg));
    });

    revalidatePath("/staff/rp-tracking");
    revalidatePath(`/staff/rp-tracking/groups/${groupId}`);
    revalidatePath("/player/rp-tracking");

    return { success: true, count: validPlayers.length };
  } catch (error) {
    console.error("[addRpTrackingGroupMembersAction] Erreur:", error);
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
  return await addRpTrackingGroupMembersAction(groupId, [userId]);
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
