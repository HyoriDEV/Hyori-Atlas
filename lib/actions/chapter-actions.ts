"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, CharacterStatus } from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";

const TITLE_MAX_LENGTH = 120;

async function requireWritingEnabled() {
  const settings = await getGlobalSettings();
  if (!settings.chapterWritingEnabled) {
    throw new Error("L'écriture de narration est temporairement désactivée par un administrateur.");
  }
}

async function requireActiveValidatedCharacter(userId: string) {
  const activeCharacter = await prisma.characterSheet.findFirst({
    where: { playerId: userId, status: CharacterStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
  });

  if (!activeCharacter) {
    throw new Error("Aucun personnage actif trouvé. Attends que le staff t'attribue un personnage.");
  }

  if (activeCharacter.reviewStatus !== CharacterSheetStatus.VALIDATED) {
    throw new Error(
      "La fiche de ton personnage actif doit être validée par le staff avant de pouvoir rédiger sa trame."
    );
  }

  return activeCharacter;
}

function assertOwnsChapter(
  chapter: { playerId: string; characterSheet?: { status: CharacterStatus } | null } | null,
  userId: string
) {
  if (!chapter || chapter.playerId !== userId) {
    throw new Error("Ce chapitre ne t'appartient pas.");
  }
  if (chapter.characterSheet && chapter.characterSheet.status !== CharacterStatus.ACTIVE) {
    throw new Error("Ce chapitre appartient à un personnage inactif ou décédé et ne peut plus être modifié.");
  }
}

async function requireOwnedChapter(chapterId: string, userId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { characterSheet: { select: { status: true } } },
  });
  assertOwnsChapter(chapter, userId);
  return chapter!;
}

export async function createChapter(title: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();
  const activeCharacter = await requireActiveValidatedCharacter(user.id);

  const trimmedTitle = title.trim() || "Nouveau chapitre";
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new Error(`Le titre ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`);
  }

  const lastChapter = await prisma.chapter.findFirst({
    where: { playerId: user.id, characterSheetId: activeCharacter.id },
    orderBy: { order: "desc" },
  });

  const chapter = await prisma.chapter.create({
    data: {
      playerId: user.id,
      characterSheetId: activeCharacter.id,
      title: trimmedTitle,
      content: "",
      order: (lastChapter?.order ?? -1) + 1,
    },
  });

  revalidatePath("/player/writing");

  return { id: chapter.id, title: chapter.title, content: chapter.content, order: chapter.order };
}

export async function updateChapterContent(chapterId: string, content: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();
  await requireOwnedChapter(chapterId, user.id);

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { content },
  });
}

export async function updateChapterTitle(chapterId: string, title: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();
  await requireOwnedChapter(chapterId, user.id);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Le titre ne peut pas être vide.");
  }
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new Error(`Le titre ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`);
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { title: trimmedTitle },
  });

  revalidatePath("/player/writing");
}

export async function deleteChapter(chapterId: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();
  await requireOwnedChapter(chapterId, user.id);

  await prisma.chapter.delete({ where: { id: chapterId } });

  revalidatePath("/player/writing");
}

export async function duplicateChapter(chapterId: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();
  const source = await requireOwnedChapter(chapterId, user.id);

  const lastChapter = await prisma.chapter.findFirst({
    where: { playerId: user.id, characterSheetId: source.characterSheetId },
    orderBy: { order: "desc" },
  });

  const duplicate = await prisma.chapter.create({
    data: {
      playerId: user.id,
      characterSheetId: source.characterSheetId,
      title: `${source.title} (Copie)`,
      content: source.content,
      order: (lastChapter?.order ?? -1) + 1,
    },
  });

  revalidatePath("/player/writing");

  return {
    id: duplicate.id,
    title: duplicate.title,
    content: duplicate.content,
    order: duplicate.order,
  };
}

export async function reorderChapters(orderedChapterIds: string[]) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();

  if (orderedChapterIds.length === 0) return;

  const firstChapter = await prisma.chapter.findUnique({
    where: { id: orderedChapterIds[0] },
    include: { characterSheet: { select: { status: true } } },
  });

  if (!firstChapter || firstChapter.playerId !== user.id) {
    throw new Error("Liste de chapitres invalide.");
  }
  if (firstChapter.characterSheet && firstChapter.characterSheet.status !== CharacterStatus.ACTIVE) {
    throw new Error("Impossible de réordonner les chapitres d'un personnage inactif.");
  }

  const chapters = await prisma.chapter.findMany({
    where: { playerId: user.id, characterSheetId: firstChapter.characterSheetId },
  });
  const ownedIds = new Set(chapters.map((chapter) => chapter.id));
  if (
    orderedChapterIds.length !== chapters.length ||
    !orderedChapterIds.every((id) => ownedIds.has(id))
  ) {
    throw new Error("Liste de chapitres invalide.");
  }

  await prisma.$transaction(
    orderedChapterIds.map((id, index) =>
      prisma.chapter.update({ where: { id }, data: { order: index } })
    )
  );

  revalidatePath("/player/writing");
}
