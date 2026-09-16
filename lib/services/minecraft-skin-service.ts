if (typeof window !== "undefined") {
  throw new Error("This module can only be imported on the server.");
}

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { normalizeMinecraftUuid } from "@/lib/services/minecraft-service";

const AVATARS_DIR = path.resolve(process.cwd(), "public", "uploads", "skins", "avatars");

export interface MinecraftSkinData {
  officialUsername?: string;
  skinUrl?: string | null;
  model?: "classic" | "slim";
}

export interface SyncSkinResult {
  success: boolean;
  userId?: string;
  minecraftUuid?: string;
  skinUrl?: string | null;
  avatarUrl?: string | null;
  model?: string | null;
  usernameUpdated?: boolean;
  error?: string;
}

/**
 * Fetches skin textures and profile information from Mojang Session Server.
 * Falls back to Ashcon API if Mojang returns 429 or is temporarily unreachable.
 */
export async function fetchMinecraftSkinData(uuid: string): Promise<MinecraftSkinData> {
  const cleanUuid = uuid.replace(/-/g, "").toLowerCase().trim();

  // 1. Try Mojang Official Session Server
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "HyoriAtlas/1.0" },
      }
    );
    clearTimeout(timeout);

    if (res.status === 200) {
      const data = (await res.json()) as {
        id?: string;
        name?: string;
        properties?: Array<{ name: string; value: string }>;
      };

      const textureProp = data.properties?.find((p) => p.name === "textures");
      if (textureProp?.value) {
        try {
          const decoded = JSON.parse(
            Buffer.from(textureProp.value, "base64").toString("utf-8")
          ) as {
            textures?: {
              SKIN?: {
                url?: string;
                metadata?: { model?: "slim" };
              };
            };
          };

          return {
            officialUsername: data.name,
            skinUrl: decoded.textures?.SKIN?.url ?? null,
            model: decoded.textures?.SKIN?.metadata?.model === "slim" ? "slim" : "classic",
          };
        } catch {
          // JSON parse failed on textures base64
        }
      }

      return {
        officialUsername: data.name,
        skinUrl: null,
        model: "classic",
      };
    }
  } catch {
    // Network error or timeout on Mojang, continue to fallback
  }

  // 2. Fallback to Ashcon Mojang API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${cleanUuid}`, {
      signal: controller.signal,
      headers: { "User-Agent": "HyoriAtlas/1.0" },
    });
    clearTimeout(timeout);

    if (res.status === 200) {
      const data = (await res.json()) as {
        username?: string;
        textures?: {
          skin?: {
            url?: string;
            slim?: boolean;
          };
        };
      };

      return {
        officialUsername: data.username,
        skinUrl: data.textures?.skin?.url ?? null,
        model: data.textures?.skin?.slim ? "slim" : "classic",
      };
    }
  } catch {
    // Fallback failed
  }

  return {};
}

/**
 * Downloads the skin image from skinUrl, extracts head & hat layers,
 * composites them and writes a crisp 128x128 avatar PNG to disk.
 */
export async function generateAndSaveAvatar(
  skinUrl: string,
  normalizedUuid: string
): Promise<string> {
  await fs.mkdir(AVATARS_DIR, { recursive: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const res = await fetch(skinUrl, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Failed to download skin image: HTTP ${res.status}`);
  }

  const skinBuffer = Buffer.from(await res.arrayBuffer());

  // Extract base face: x: 8, y: 8, 8x8
  const faceBuffer = await sharp(skinBuffer)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .toBuffer();

  // Extract outer hat layer: x: 40, y: 8, 8x8
  const hatBuffer = await sharp(skinBuffer)
    .extract({ left: 40, top: 8, width: 8, height: 8 })
    .toBuffer();

  // Composite hat on top of face and scale to 128x128 with nearest-neighbor interpolation
  const avatarBuffer = await sharp(faceBuffer)
    .composite([{ input: hatBuffer }])
    .resize(128, 128, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  const filePath = path.join(AVATARS_DIR, `${normalizedUuid}.png`);
  await fs.writeFile(filePath, avatarBuffer);

  return `/uploads/skins/avatars/${normalizedUuid}.png`;
}

/**
 * Synchronizes the skin for a specific user by userId or minecraftUuid.
 */
export async function syncUserMinecraftSkin(
  identifier: string,
  options?: { force?: boolean }
): Promise<SyncSkinResult> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { minecraftUuid: identifier }],
    },
    select: {
      id: true,
      minecraftUuid: true,
      minecraftUsername: true,
      minecraftSkinUrl: true,
      minecraftAvatarUrl: true,
    },
  });

  if (!user || !user.minecraftUuid) {
    return {
      success: false,
      error: "USER_OR_UUID_NOT_FOUND",
    };
  }

  const normalizedUuid = normalizeMinecraftUuid(user.minecraftUuid);
  if (!normalizedUuid) {
    return {
      success: false,
      error: "INVALID_UUID",
    };
  }

  try {
    const skinData = await fetchMinecraftSkinData(normalizedUuid);

    let avatarUrl = user.minecraftAvatarUrl;

    if (skinData.skinUrl) {
      // Regenerate avatar if skin changed, if avatar is missing, or if forced
      const skinChanged = skinData.skinUrl !== user.minecraftSkinUrl;
      const avatarMissing = !avatarUrl;

      if (skinChanged || avatarMissing || options?.force) {
        try {
          avatarUrl = await generateAndSaveAvatar(skinData.skinUrl, normalizedUuid);
        } catch (avatarError) {
          console.error(
            `[MinecraftSkinService] Failed to generate avatar for ${user.minecraftUsername} (${normalizedUuid}):`,
            avatarError
          );
        }
      }
    }

    const usernameChanged =
      Boolean(skinData.officialUsername) &&
      skinData.officialUsername?.toLowerCase() !== user.minecraftUsername?.toLowerCase();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        minecraftSkinUrl: skinData.skinUrl ?? user.minecraftSkinUrl,
        minecraftSkinModel: skinData.model ?? null,
        minecraftSkinUpdatedAt: new Date(),
        minecraftAvatarUrl: avatarUrl,
        ...(usernameChanged && skinData.officialUsername
          ? { minecraftUsername: skinData.officialUsername }
          : {}),
      },
    });

    return {
      success: true,
      userId: user.id,
      minecraftUuid: normalizedUuid,
      skinUrl: skinData.skinUrl,
      avatarUrl,
      model: skinData.model,
      usernameUpdated: usernameChanged,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return {
      success: false,
      userId: user.id,
      minecraftUuid: normalizedUuid,
      error: message,
    };
  }
}

/**
 * Synchronizes skins for all linked players.
 *
 * @param options.maxAgeMinutes Only sync skins older than this duration (default: 60 minutes = 1h).
 * @param options.limit Max users to process in this run.
 * @param options.delayMs Delay between each user request to prevent Mojang rate-limiting (default: 200ms).
 */
export async function syncAllMinecraftSkins(options?: {
  maxAgeMinutes?: number;
  limit?: number;
  delayMs?: number;
}): Promise<{
  totalEligible: number;
  synced: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const maxAge = options?.maxAgeMinutes ?? 60;
  const delayMs = options?.delayMs ?? 200;
  const cutoffDate = new Date(Date.now() - maxAge * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      minecraftUuid: { not: null },
      OR: [{ minecraftSkinUpdatedAt: null }, { minecraftSkinUpdatedAt: { lt: cutoffDate } }],
    },
    select: {
      id: true,
      minecraftUuid: true,
      minecraftUsername: true,
    },
    take: options?.limit,
    orderBy: {
      minecraftSkinUpdatedAt: "asc", // Oldest synced first
    },
  });

  const summary = {
    totalEligible: users.length,
    synced: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  };

  for (const user of users) {
    if (!user.minecraftUuid) continue;

    const result = await syncUserMinecraftSkin(user.id);
    if (result.success) {
      summary.synced++;
    } else {
      summary.failed++;
      summary.errors.push({
        userId: user.id,
        error: result.error ?? "SYNC_FAILED",
      });
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return summary;
}
