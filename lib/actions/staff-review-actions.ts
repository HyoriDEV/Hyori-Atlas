"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterClass,
  CharacterSheetCommentTarget,
  CharacterSheetStatus,
  CharacterStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles } from "@/lib/navigation";
import {
  excludePlayerOnDiscord,
  notifyPlayerCharacterSheetStatus,
  notifyPlayerRegistrationStatus,
  syncPlayerWhitelistClassRole,
} from "@/lib/services/discord-bot-service";
import {
  COMMENT_BODY_MAX_LENGTH,
  isNarrativeCommentTarget,
  type SheetCommentInput,
} from "@/lib/character-sheet-comments";

function revalidateSheetSurfaces(playerId: string) {
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${playerId}`);
  revalidatePath(`/staff/atlas/${playerId}/evaluation`);
  revalidatePath("/player/character-sheet");
  revalidatePath("/player", "layout");
  revalidatePath("/player/writing");
}

export async function submitCharacterSheetEvaluation(
  sheetId: string,
  comments: SheetCommentInput[],
  expectedUpdatedAt?: string
) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const sheet = await prisma.characterSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { player: true },
  });

  if (sheet.player.registrationStatus === RegistrationStatus.REJECTED) {
    throw new Error("Ce joueur a été refusé et sa fiche ne peut plus être évaluée.");
  }

  if (sheet.reviewStatus !== CharacterSheetStatus.PENDING_STAFF) {
    throw new Error("Cette fiche n'est pas en attente d'évaluation par le staff.");
  }

  if (expectedUpdatedAt && sheet.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new Error(
      "Cette fiche ou son évaluation a été modifiée par un autre utilisateur entre-temps. Rafraîchis la page pour voir les derniers changements."
    );
  }

  if (comments.length > 30) {
    throw new Error("Une évaluation ne peut pas comporter plus de 30 commentaires.");
  }

  const sanitizedComments = comments.map((comment) => {
    const body = comment.body.trim();

    if (!body) {
      throw new Error("Chaque commentaire doit contenir un message.");
    }
    if (body.length > COMMENT_BODY_MAX_LENGTH) {
      throw new Error(`Un commentaire ne peut pas dépasser ${COMMENT_BODY_MAX_LENGTH} caractères.`);
    }
    if (!Object.values(CharacterSheetCommentTarget).includes(comment.target)) {
      throw new Error("Élément de fiche invalide pour ce commentaire.");
    }
    if (comment.anchor && !isNarrativeCommentTarget(comment.target)) {
      throw new Error("Seules la description et l'histoire acceptent un extrait ciblé.");
    }
    if (comment.anchor && !comment.anchor.quotedText.trim()) {
      throw new Error("L'extrait ciblé est vide.");
    }

    return {
      sheetId,
      authorId: staffUser.id,
      target: comment.target,
      body,
      quotedText: comment.anchor?.quotedText ?? null,
      anchorStart: comment.anchor?.anchorStart ?? null,
      anchorPrefix: comment.anchor?.anchorPrefix ?? null,
      anchorSuffix: comment.anchor?.anchorSuffix ?? null,
    };
  });

  const hasComments = sanitizedComments.length > 0;
  const nextStatus = hasComments
    ? CharacterSheetStatus.PENDING_PLAYER
    : CharacterSheetStatus.VALIDATED;

  await prisma.$transaction([
    prisma.characterSheetComment.deleteMany({ where: { sheetId } }),
    prisma.characterSheetComment.createMany({ data: sanitizedComments }),
    prisma.characterSheet.update({
      where: { id: sheetId },
      data: {
        reviewStatus: nextStatus,
        hasUnreadFeedback: hasComments,
      },
    }),
    prisma.characterSheetReviewHistory.create({
      data: {
        sheetId,
        authorId: staffUser.id,
        status: nextStatus,
        commentCount: sanitizedComments.length,
        note: hasComments ? "Modifications demandées par le staff" : "Fiche validée par le staff",
      },
    }),
  ]);

  if (sheet.player?.discordId) {
    if (hasComments) {
      await notifyPlayerCharacterSheetStatus(
        sheet.player.discordId,
        CharacterSheetStatus.PENDING_PLAYER
      );
    } else {
      await notifyPlayerCharacterSheetStatus(
        sheet.player.discordId,
        CharacterSheetStatus.VALIDATED
      );
    }
  }

  revalidateSheetSurfaces(sheet.playerId);
}

export async function reopenCharacterSheetReview(sheetId: string, note?: string) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const sheet = await prisma.characterSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { player: true },
  });

  if (sheet.reviewStatus !== CharacterSheetStatus.VALIDATED) {
    throw new Error("Seule une fiche validée peut être rouverte.");
  }

  await prisma.$transaction([
    prisma.characterSheet.update({
      where: { id: sheetId },
      data: {
        reviewStatus: CharacterSheetStatus.PENDING_PLAYER,
        hasUnreadFeedback: false,
      },
    }),
    prisma.characterSheetReviewHistory.create({
      data: {
        sheetId,
        authorId: staffUser.id,
        status: CharacterSheetStatus.PENDING_PLAYER,
        commentCount: 0,
        note: note?.trim() || "Réouverture de la fiche par le staff",
      },
    }),
  ]);

  if (sheet.player?.discordId) {
    await notifyPlayerCharacterSheetStatus(sheet.player.discordId, "REOPENED");
  }

  revalidateSheetSurfaces(sheet.playerId);
}

export interface PromoteToWhitelistedResult {
  success: boolean;
  discordSynced: boolean;
  discordError?: string;
  discordNotified?: boolean;
}

export async function promoteToWhitelisted(
  userId: string,
  assignedClass: CharacterClass,
  characterSheetId?: string
): Promise<PromoteToWhitelistedResult> {
  const staffUser = await requireRole([Role.ADMIN]);

  if (!assignedClass || !Object.values(CharacterClass).includes(assignedClass)) {
    throw new Error("Une classe RP valide doit obligatoirement être attribuée au joueur.");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, discordId: true },
  });

  const sheet = characterSheetId
    ? await prisma.characterSheet.findFirst({
        where: { id: characterSheetId, playerId: userId },
      })
    : ((await prisma.characterSheet.findFirst({
        where: { playerId: userId, status: CharacterStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
      })) ??
      (await prisma.characterSheet.findFirst({
        where: { playerId: userId },
        orderBy: { createdAt: "desc" },
      })));

  if (!sheet) {
    throw new Error("Ce joueur n'a pas encore de fiche personnage.");
  }

  await prisma.$transaction([
    prisma.characterSheetComment.deleteMany({ where: { sheetId: sheet.id } }),
    prisma.characterSheet.update({
      where: { id: sheet.id },
      data: {
        reviewStatus: CharacterSheetStatus.VALIDATED,
        assignedClass: assignedClass,
        hasUnreadFeedback: false,
      },
    }),
    prisma.characterSheetReviewHistory.create({
      data: {
        sheetId: sheet.id,
        authorId: staffUser.id,
        status: CharacterSheetStatus.VALIDATED,
        commentCount: 0,
        note: `Validation de la whitelist avec attribution de la classe ${assignedClass}`,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { registrationStatus: RegistrationStatus.WHITELISTED },
    }),
    prisma.registrationStatusHistory.create({
      data: { userId, authorId: staffUser.id, status: RegistrationStatus.WHITELISTED },
    }),
  ]);

  let discordSynced = false;
  let discordError: string | undefined;
  let discordNotified = false;

  if (user.discordId) {
    // 1. Synchronisation du rôle whitelist et du rôle de classe sur Discord
    const roleSyncResult = await syncPlayerWhitelistClassRole(user.discordId, true, assignedClass);
    discordSynced = roleSyncResult.success;
    if (!roleSyncResult.success) {
      discordError = roleSyncResult.error || "Impossible d'attribuer les rôles sur Discord";
      console.error(
        `[PromoteToWhitelisted] Échec de la synchronisation des rôles Discord pour ${user.discordId}:`,
        discordError
      );
    }

    // 2. Notification MP de la validation définitive (inclut le lien d'invitation vers le Discord du village)
    const notifyResult = await notifyPlayerRegistrationStatus(
      user.discordId,
      RegistrationStatus.WHITELISTED,
      undefined,
      undefined,
      assignedClass
    );
    discordNotified = notifyResult.success && Boolean(notifyResult.notified);
  }

  revalidateSheetSurfaces(userId);

  return {
    success: true,
    discordSynced,
    discordError,
    discordNotified,
  };
}

/**
 * Refuse un joueur actuellement en cours de whitelist (WHITELIST_IN_PROGRESS).
 * - Son statut passe à REJECTED (comme s'il n'avait pas passé la liste d'attente).
 * - Sa fiche personnage reste enregistrée en base et n'est pas modifiée.
 * - S'il est présent sur le Discord communautaire : retrait de tous ses rôles et attribution du rôle unique d'exclusion avec sauvegarde des rôles précédents.
 * - Envoi d'une notification MP de refus identique à celle de la liste d'attente.
 */
export async function rejectWhitelistPlayer(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      discordId: true,
      minecraftUsername: true,
      discordDisplayName: true,
      registrationStatus: true,
    },
  });

  if (!user) {
    throw new Error("Joueur introuvable.");
  }

  if (user.registrationStatus !== RegistrationStatus.WHITELIST_IN_PROGRESS) {
    throw new Error("Seul un joueur en statut 'En whitelist' peut être refusé.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS },
      data: { registrationStatus: RegistrationStatus.REJECTED },
    }),
    prisma.registrationStatusHistory.create({
      data: {
        userId,
        authorId: staffUser.id,
        status: RegistrationStatus.REJECTED,
      },
    }),
  ]);

  let discordSanctionApplied = false;
  let discordError: string | undefined;
  let discordNotified = false;

  if (user.discordId) {
    // 1. Exclusion Discord avec sauvegarde des rôles (si présent sur le serveur communautaire)
    const sanctionResult = await excludePlayerOnDiscord(
      user.discordId,
      "Refus d'accès à la whitelist",
      {
        action: "WHITELIST_REFUSAL",
        staffAuthorId: staffUser.id,
        userId: user.id,
      }
    );

    if (sanctionResult.success) {
      discordSanctionApplied = sanctionResult.inGuild;
    } else {
      discordError = sanctionResult.error;
      console.error(
        `[RejectWhitelistPlayer] Échec de l'exclusion Discord pour ${user.discordId}:`,
        sanctionResult.error
      );
    }

    // 2. Notification MP identique au refus de liste d'attente
    const notifyResult = await notifyPlayerRegistrationStatus(
      user.discordId,
      RegistrationStatus.REJECTED
    );
    discordNotified = notifyResult.success && Boolean(notifyResult.notified);
  }

  revalidateSheetSurfaces(userId);
  revalidatePath("/staff/waitlist");
  revalidatePath("/player");
  revalidatePath("/player", "layout");
  revalidatePath("/player/rejection");

  return {
    success: true,
    discordSanctionApplied,
    discordError,
    discordNotified,
  };
}

