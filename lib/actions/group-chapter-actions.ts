"use server";

import { revalidatePath } from "next/cache";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { getGlobalSettings } from "@/lib/services/settings-service";

// ==========================================
// Narration de groupe : tous les membres du groupe écrivent, le staff aussi.
// ==========================================

const TITLE_MAX_LENGTH = 120;

type GroupChapterResult = { id: string; title: string; content: string; order: number };

/** Vérifie que l'utilisateur est staff suivi RP ou membre du groupe. */
async function requireGroupWriter(groupId: string) {
  const user = await requireActivePlayer();
  const isStaff = rpTrackingStaffRoles.includes(user.role);

  const group = await prisma.rpTrackingGroup.findUnique({
    where: { id: groupId },
    select: { id: true, members: { where: { userId: user.id }, select: { id: true } } },
  });
  if (!group) {
    throw new Error("Groupe de suivi introuvable.");
  }

  if (!isStaff) {
    if (group.members.length === 0) {
      throw new Error("Tu ne fais pas partie de ce groupe.");
    }
    const settings = await getGlobalSettings();
    if (!settings.chapterWritingEnabled) {
      throw new Error(
        "L'écriture de narration est temporairement désactivée par un administrateur."
      );
    }
  }

  return user;
}

async function requireGroupChapter(chapterId: string) {
  const chapter = await prisma.rpTrackingGroupChapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    throw new Error("Chapitre de groupe introuvable.");
  }
  await requireGroupWriter(chapter.groupId);
  return chapter;
}

function revalidateGroup(groupId: string) {
  revalidatePath(`/staff/rp-tracking/groups/${groupId}`);
  revalidatePath("/player/rp-tracking");
}

function checkTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Le titre ne peut pas être vide.");
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw new Error(`Le titre ne peut pas dépasser ${TITLE_MAX_LENGTH} caractères.`);
  }
  return trimmed;
}

export async function createGroupChapterAction(
  groupId: string,
  title: string
): Promise<GroupChapterResult> {
  await requireGroupWriter(groupId);
  const trimmedTitle = checkTitle(title || "Nouveau chapitre de groupe");

  const lastChapter = await prisma.rpTrackingGroupChapter.findFirst({
    where: { groupId },
    orderBy: { order: "desc" },
  });

  const chapter = await prisma.rpTrackingGroupChapter.create({
    data: {
      groupId,
      title: trimmedTitle,
      content: "",
      order: (lastChapter?.order ?? -1) + 1,
    },
  });

  revalidateGroup(groupId);
  return { id: chapter.id, title: chapter.title, content: chapter.content, order: chapter.order };
}

export async function updateGroupChapterContentAction(
  chapterId: string,
  content: string
): Promise<void> {
  await requireGroupChapter(chapterId);
  await prisma.rpTrackingGroupChapter.update({ where: { id: chapterId }, data: { content } });
}

export async function updateGroupChapterTitleAction(
  chapterId: string,
  title: string
): Promise<void> {
  const chapter = await requireGroupChapter(chapterId);
  await prisma.rpTrackingGroupChapter.update({
    where: { id: chapterId },
    data: { title: checkTitle(title) },
  });
  revalidateGroup(chapter.groupId);
}

export async function deleteGroupChapterAction(chapterId: string): Promise<void> {
  const chapter = await requireGroupChapter(chapterId);
  await prisma.rpTrackingGroupChapter.delete({ where: { id: chapterId } });
  revalidateGroup(chapter.groupId);
}

export async function duplicateGroupChapterAction(
  chapterId: string
): Promise<GroupChapterResult> {
  const source = await requireGroupChapter(chapterId);

  const lastChapter = await prisma.rpTrackingGroupChapter.findFirst({
    where: { groupId: source.groupId },
    orderBy: { order: "desc" },
  });

  const duplicate = await prisma.rpTrackingGroupChapter.create({
    data: {
      groupId: source.groupId,
      title: `${source.title} (Copie)`.slice(0, TITLE_MAX_LENGTH),
      content: source.content,
      order: (lastChapter?.order ?? -1) + 1,
    },
  });

  revalidateGroup(source.groupId);
  return {
    id: duplicate.id,
    title: duplicate.title,
    content: duplicate.content,
    order: duplicate.order,
  };
}

export async function reorderGroupChaptersAction(
  groupId: string,
  orderedChapterIds: string[]
): Promise<void> {
  await requireGroupWriter(groupId);
  if (orderedChapterIds.length === 0) return;

  const chapters = await prisma.rpTrackingGroupChapter.findMany({
    where: { groupId },
    select: { id: true },
  });
  const ownedIds = new Set(chapters.map((c) => c.id));
  if (
    orderedChapterIds.length !== chapters.length ||
    !orderedChapterIds.every((id) => ownedIds.has(id))
  ) {
    throw new Error("Liste de chapitres invalide.");
  }

  await prisma.$transaction(
    orderedChapterIds.map((id, index) =>
      prisma.rpTrackingGroupChapter.update({ where: { id }, data: { order: index } })
    )
  );

  revalidateGroup(groupId);
}
