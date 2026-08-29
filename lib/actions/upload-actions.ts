"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import sharp from "sharp";

import { requireActivePlayer, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

async function processAndStoreUpload(file: File, scope: string, ownerId: string) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("L'image est trop volumineuse (10 Mo maximum).");
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Format d'image non supporté (JPEG, PNG, WEBP ou GIF uniquement).");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const directory = path.join(UPLOADS_ROOT, scope, ownerId);
  await mkdir(directory, { recursive: true });

  const fileName = `${randomUUID()}.webp`;
  await writeFile(path.join(directory, fileName), outputBuffer);

  return { url: `/uploads/${scope}/${ownerId}/${fileName}` };
}

export async function uploadChapterImage(formData: FormData): Promise<{ url: string }> {
  const user = await requireActivePlayer();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Aucun fichier reçu.");
  }

  return processAndStoreUpload(file, "chapters", user.id);
}

export async function uploadConversationImage(
  formData: FormData,
  conversationId: string
): Promise<{ url: string }> {
  const user = await requireUser();

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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Aucun fichier reçu.");
  }

  return processAndStoreUpload(file, "conversations", conversationId);
}
