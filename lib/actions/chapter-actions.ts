"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";

const TITLE_MAX_LENGTH = 120;

async function requireWritingEnabled() {
  const settings = await getGlobalSettings();
  if (!settings.chapterWritingEnabled) {
    throw new Error("L'écriture de narration est temporairement désactivée par un administrateur.");
  }
}

function assertOwnsChapter(chapter: { playerId: string } | null, userId: string) {
  if (!chapter || chapter.playerId !== userId) {
    throw new Error("Ce chapitre ne t'appartient pas.");
  }
}

async function requireOwnedChapter(chapterId: string, userId: string) {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  assertOwnsChapter(chapter, userId);
  return chapter!;
}

export async function createChapter(title: string) {
  await requireWritingEnabled();
  const user = await requireActivePlayer();

  const trimmedTitle = title.trim() || "Nouveau chapitre";
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new Error(`Le titre ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`);
  }

  const lastChapter = await prisma.chapter.findFirst({
    where: { playerId: user.id },
    orderBy: { order: "desc" },
  });

  const chapter = await prisma.chapter.create({
    data: {
      playerId: user.id,
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
    where: { playerId: user.id },
    orderBy: { order: "desc" },
  });

  const duplicate = await prisma.chapter.create({
    data: {
      playerId: user.id,
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

  const chapters = await prisma.chapter.findMany({ where: { playerId: user.id } });
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
