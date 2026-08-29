"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetCommentTarget,
  CharacterSheetStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles } from "@/lib/navigation";
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

  revalidateSheetSurfaces(sheet.playerId);
}

export async function reopenCharacterSheetReview(sheetId: string, note?: string) {
  const staffUser = await requireRole(characterSheetReviewerRoles);

  const sheet = await prisma.characterSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { player: true },
  });

  await prisma.$transaction([
    prisma.characterSheet.update({
      where: { id: sheetId },
      data: {
        reviewStatus: CharacterSheetStatus.PENDING_STAFF,
        hasUnreadFeedback: false,
      },
    }),
    prisma.characterSheetReviewHistory.create({
      data: {
        sheetId,
        authorId: staffUser.id,
        status: CharacterSheetStatus.PENDING_STAFF,
        commentCount: 0,
        note: note?.trim() || "Réouverture de la fiche par le staff",
      },
    }),
  ]);

  revalidateSheetSurfaces(sheet.playerId);
}

export async function promoteToWhitelisted(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const sheet = await prisma.characterSheet.findUnique({ where: { playerId: userId } });
  if (!sheet) {
    throw new Error("Ce joueur n'a pas encore de fiche personnage.");
  }

  const isSheetAlreadyValidated = sheet.reviewStatus === CharacterSheetStatus.VALIDATED;

  await prisma.$transaction([
    ...(isSheetAlreadyValidated
      ? []
      : [
          prisma.characterSheetComment.deleteMany({ where: { sheetId: sheet.id } }),
          prisma.characterSheet.update({
            where: { id: sheet.id },
            data: {
              reviewStatus: CharacterSheetStatus.VALIDATED,
              hasUnreadFeedback: false,
            },
          }),
          prisma.characterSheetReviewHistory.create({
            data: {
              sheetId: sheet.id,
              authorId: staffUser.id,
              status: CharacterSheetStatus.VALIDATED,
              commentCount: 0,
              note: "Validation automatique lors du passage en whitelist",
            },
          }),
        ]),
    prisma.user.update({
      where: { id: userId },
      data: { registrationStatus: RegistrationStatus.WHITELISTED },
    }),
    prisma.registrationStatusHistory.create({
      data: { userId, authorId: staffUser.id, status: RegistrationStatus.WHITELISTED },
    }),
  ]);

  revalidateSheetSurfaces(userId);
}
