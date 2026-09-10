"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import sharp from "sharp";

import { requireActivePlayer, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, validateImageFile } from "@/lib/upload-config";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

async function processAndStoreUpload(file: File, scope: string, ownerId: string) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
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

export async function uploadBdaImage(formData: FormData): Promise<{ url: string }> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Aucun fichier reçu.");
  }

  return processAndStoreUpload(file, "bda-reports", user.id);
}
