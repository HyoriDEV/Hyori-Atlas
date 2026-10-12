"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

import { requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { getUserTodayUploadCount } from "@/lib/services/gallery-service";
import { validateGalleryImageFile } from "@/lib/upload-config";
import {
  GalleryCategory,
  GalleryStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "gallery");

export async function submitGalleryItemAction(formData: FormData) {
  const user = await requireUser();

  // Règle stricte validée : Seuls les joueurs au statut WHITELISTED peuvent soumettre
  if (user.registrationStatus !== RegistrationStatus.WHITELISTED && user.role !== Role.ADMIN) {
    throw new Error(
      "Seuls les joueurs acceptés sur la whitelist de Hyori RP peuvent partager des captures d'écran."
    );
  }

  const settings = await getGlobalSettings();
  if (!settings.gallerySubmissionsEnabled && user.role !== Role.ADMIN) {
    throw new Error("Les soumissions de captures sont temporairement suspendues.");
  }

  // Vérification du quota journalier
  const todayCount = await getUserTodayUploadCount(user.id);
  if (todayCount >= settings.galleryMaxDailyUploads && user.role !== Role.ADMIN) {
    throw new Error(
      `Tu as atteint la limite quotidienne de ${settings.galleryMaxDailyUploads} captures par jour.`
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Aucun fichier image reçu.");
  }

  const validation = validateGalleryImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Fichier invalide.");
  }

  const title = (formData.get("title") as string)?.trim();
  if (!title || title.length < 2 || title.length > 120) {
    throw new Error("Le titre doit contenir entre 2 et 120 caractères.");
  }

  const description = (formData.get("description") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const shader = (formData.get("shader") as string)?.trim() || null;
  const isSpoiler = formData.get("isSpoiler") === "true";

  const rawCategory = formData.get("category") as string;
  const category = Object.values(GalleryCategory).includes(rawCategory as GalleryCategory)
    ? (rawCategory as GalleryCategory)
    : GalleryCategory.PAYSAGE;

  const rawTaggedUsers = formData.get("taggedUserIds");
  let taggedUserIds: string[] = [];
  if (typeof rawTaggedUsers === "string" && rawTaggedUsers.length > 0) {
    try {
      taggedUserIds = JSON.parse(rawTaggedUsers);
    } catch {
      taggedUserIds = [];
    }
  }

  // Traitement d'image Sharp : format Full HD et format Miniature
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const imageInstance = sharp(inputBuffer).rotate();
  const metadata = await imageInstance.metadata();

  const [fullBuffer, thumbBuffer] = await Promise.all([
    imageInstance
      .clone()
      .resize({ width: 2560, height: 1440, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
    imageInstance
      .clone()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer(),
  ]);

  const userDir = path.join(UPLOADS_ROOT, user.id);
  await mkdir(userDir, { recursive: true });

  const fileUuid = randomUUID();
  const fullFileName = `${fileUuid}.webp`;
  const thumbFileName = `${fileUuid}-thumb.webp`;

  await Promise.all([
    writeFile(path.join(userDir, fullFileName), fullBuffer),
    writeFile(path.join(userDir, thumbFileName), thumbBuffer),
  ]);

  const imageUrl = `/uploads/gallery/${user.id}/${fullFileName}`;
  const thumbnailUrl = `/uploads/gallery/${user.id}/${thumbFileName}`;

  const status = settings.galleryAutoApprove ? GalleryStatus.APPROVED : GalleryStatus.PENDING;

  const item = await prisma.galleryItem.create({
    data: {
      title,
      description,
      location,
      shader,
      category,
      imageUrl,
      thumbnailUrl,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      status,
      isSpoiler,
      authorId: user.id,
      taggedUsers:
        taggedUserIds.length > 0
          ? {
              create: taggedUserIds.map((targetUserId) => ({
                userId: targetUserId,
              })),
            }
          : undefined,
    },
  });

  revalidatePath("/gallery");
  revalidatePath("/player/gallery");
  revalidatePath("/staff/gallery");

  return {
    success: true,
    itemId: item.id,
    status: item.status,
  };
}

export async function toggleGalleryLikeAction(galleryItemId: string) {
  const user = await requireUser();

  const existingLike = await prisma.galleryLike.findUnique({
    where: {
      galleryItemId_userId: {
        galleryItemId,
        userId: user.id,
      },
    },
  });

  let liked = false;
  if (existingLike) {
    await prisma.galleryLike.delete({
      where: { id: existingLike.id },
    });
    liked = false;
  } else {
    await prisma.galleryLike.create({
      data: {
        galleryItemId,
        userId: user.id,
      },
    });
    liked = true;
  }

  const newCount = await prisma.galleryLike.count({
    where: { galleryItemId },
  });

  revalidatePath("/gallery");

  return { liked, newCount };
}

export async function reviewGalleryItemAction({
  itemId,
  status,
  rejectionReason,
}: {
  itemId: string;
  status: GalleryStatus;
  rejectionReason?: string;
}) {
  // Règle stricte validée : Seuls les Administrateurs gèrent la galerie
  const staff = await requireRole([Role.ADMIN]);

  await prisma.galleryItem.update({
    where: { id: itemId },
    data: {
      status,
      rejectionReason: status === GalleryStatus.REJECTED ? rejectionReason || null : null,
      reviewedById: staff.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");
  revalidatePath("/player/gallery");

  return { success: true };
}

export async function toggleFeaturedGalleryItemAction(itemId: string) {
  await requireRole([Role.ADMIN]);

  const item = await prisma.galleryItem.findUnique({
    where: { id: itemId },
    select: { isFeatured: true },
  });

  if (!item) {
    throw new Error("Capture introuvable.");
  }

  const updated = await prisma.galleryItem.update({
    where: { id: itemId },
    data: { isFeatured: !item.isFeatured },
  });

  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");

  return { success: true, isFeatured: updated.isFeatured };
}

export async function deleteGalleryItemAction(itemId: string) {
  const user = await requireUser();

  const item = await prisma.galleryItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error("Capture introuvable.");
  }

  // Seul l'auteur ou un Administrateur peut supprimer
  if (item.authorId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Tu n'as pas l'autorisation de supprimer cette capture.");
  }

  await prisma.galleryItem.delete({
    where: { id: itemId },
  });

  // Nettoyage des fichiers sur le disque (silencieux si déjà supprimés)
  try {
    const fullPath = path.join(process.cwd(), "public", item.imageUrl);
    const thumbPath = path.join(process.cwd(), "public", item.thumbnailUrl);
    await Promise.all([unlink(fullPath).catch(() => {}), unlink(thumbPath).catch(() => {})]);
  } catch {
    // Non bloquant
  }

  revalidatePath("/gallery");
  revalidatePath("/player/gallery");
  revalidatePath("/staff/gallery");

  return { success: true };
}

export async function updateGalleryItemMetadataAction(
  itemId: string,
  data: {
    title: string;
    description?: string | null;
    location?: string | null;
    shader?: string | null;
    category: GalleryCategory;
    isSpoiler: boolean;
  }
) {
  const user = await requireUser();

  const item = await prisma.galleryItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error("Capture introuvable.");
  }

  if (item.authorId !== user.id && user.role !== Role.ADMIN) {
    throw new Error("Tu n'as pas l'autorisation de modifier cette capture.");
  }

  await prisma.galleryItem.update({
    where: { id: itemId },
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      shader: data.shader?.trim() || null,
      category: data.category,
      isSpoiler: data.isSpoiler,
    },
  });

  revalidatePath("/gallery");
  revalidatePath("/player/gallery");
  revalidatePath("/staff/gallery");

  return { success: true };
}
