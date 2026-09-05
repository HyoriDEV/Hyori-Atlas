"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 Mo max
const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
];

export async function uploadCountdownVideoAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireRole([Role.ADMIN]);

    const file = formData.get("videoFile");
    if (!(file instanceof File)) {
      return { success: false, error: "Aucun fichier vidéo n'a été transmis." };
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return { success: false, error: "Le fichier vidéo dépasse la taille maximale autorisée (100 Mo)." };
    }

    const fileExt = path.extname(file.name).toLowerCase();
    const isAllowedExt = [".mp4", ".webm", ".mov", ".ogg", ".mkv"].includes(fileExt);
    const isAllowedMime = ALLOWED_VIDEO_MIMES.includes(file.type);

    if (!isAllowedExt && !isAllowedMime) {
      return {
        success: false,
        error: "Format vidéo non supporté. Formats acceptés : MP4, WEBM, MOV, OGG.",
      };
    }

    const ext = fileExt || (file.type === "video/webm" ? ".webm" : ".mp4");
    const fileName = `countdown-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), buffer);

    const relativeUrl = `/uploads/videos/${fileName}`;

    return {
      success: true,
      url: relativeUrl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Échec du téléversement de la vidéo.";
    return {
      success: false,
      error: message,
    };
  }
}
