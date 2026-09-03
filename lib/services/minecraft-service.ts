if (typeof window !== "undefined") {
  throw new Error("This module can only be imported on the server.");
}

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";

// Base32 charset excluding ambiguous characters (0, O, 1, I, L)
const CODE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const CODE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a cryptographically secure random alphanumeric code.
 */
export function generateSecureCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return code;
}

/**
 * Normalizes UUID to standard 8-4-4-4-12 lowercase format.
 */
export function normalizeMinecraftUuid(uuid: string): string | null {
  const clean = uuid.replace(/-/g, "").toLowerCase().trim();
  if (!/^[0-9a-f]{32}$/.test(clean)) {
    return null;
  }
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * Verifies with Mojang API that UUID and Username match.
 * Fails open if Mojang API is temporarily down, but fails closed on confirmed mismatch.
 */
export async function verifyMojangProfile(
  uuid: string,
  username: string
): Promise<{ valid: boolean; reason?: string }> {
  const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "HyoriAtlas/1.0" },
      }
    );
    clearTimeout(timeout);

    if (response.status === 200) {
      const data = (await response.json()) as { id?: string; name?: string };
      if (data.name && data.name.toLowerCase() !== username.toLowerCase()) {
        return { valid: false, reason: "MOJANG_NAME_MISMATCH" };
      }
      return { valid: true };
    }

    if (response.status === 204 || response.status === 404) {
      // Mojang says this profile doesn't exist
      return { valid: false, reason: "MOJANG_PROFILE_NOT_FOUND" };
    }

    // If rate-limited (429) or 5xx, fail-open to not block legitimate players
    return { valid: true };
  } catch {
    // Network error or timeout: fail-open
    return { valid: true };
  }
}

/**
 * Generates an authentication code for a user.
 * Invalidates any existing unconsumed codes.
 */
export async function createMinecraftAuthCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, minecraftUuid: true, registrationStatus: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.minecraftUuid) {
    throw new Error("ALREADY_LINKED");
  }

  // Delete / invalidate previous unused codes for this user
  await prisma.minecraftAuthCode.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  // Try generating a unique code (retry if collisions occur)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateSecureCode();
    const existing = await prisma.minecraftAuthCode.findUnique({
      where: { code: candidate },
    });
    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    throw new Error("FAILED_TO_GENERATE_CODE");
  }

  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS);

  const authCode = await prisma.minecraftAuthCode.create({
    data: {
      code,
      userId,
      expiresAt,
    },
  });

  return {
    code: authCode.code,
    expiresAt: authCode.expiresAt,
  };
}

/**
 * Retrieves the currently active authentication code for a user, if any.
 */
export async function getActiveMinecraftAuthCode(userId: string) {
  const now = new Date();
  const activeCode = await prisma.minecraftAuthCode.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeCode) {
    return null;
  }

  return {
    code: activeCode.code,
    expiresAt: activeCode.expiresAt,
  };
}

export interface LinkResult {
  success: boolean;
  message: string;
  minecraftUsername?: string;
  error?: string;
}

/**
 * Validates a Minecraft auth code and links the player account atomically.
 */
export async function verifyAndLinkMinecraftAccount(params: {
  code: string;
  minecraftUuid: string;
  minecraftUsername: string;
  ipAddress?: string;
  skipMojangCheck?: boolean;
}): Promise<LinkResult> {
  const { code, ipAddress, skipMojangCheck } = params;
  const normalizedCode = code.trim().toUpperCase();
  const normalizedUuid = normalizeMinecraftUuid(params.minecraftUuid);
  const trimmedUsername = params.minecraftUsername.trim();

  // Validate format
  if (!normalizedUuid) {
    await logAttempt({
      code: normalizedCode,
      minecraftUuid: params.minecraftUuid,
      minecraftUsername: trimmedUsername,
      ipAddress,
      success: false,
      reason: "INVALID_UUID_FORMAT",
    });
    return { success: false, message: "Format d'UUID Minecraft invalide.", error: "INVALID_UUID" };
  }

  if (!/^[a-zA-Z0-9_]{2,16}$/.test(trimmedUsername)) {
    await logAttempt({
      code: normalizedCode,
      minecraftUuid: normalizedUuid,
      minecraftUsername: trimmedUsername,
      ipAddress,
      success: false,
      reason: "INVALID_USERNAME_FORMAT",
    });
    return {
      success: false,
      message: "Format de pseudo Minecraft invalide.",
      error: "INVALID_USERNAME",
    };
  }

  // Mojang verification (optional but recommended)
  if (!skipMojangCheck) {
    const mojangVerification = await verifyMojangProfile(normalizedUuid, trimmedUsername);
    if (!mojangVerification.valid) {
      await logAttempt({
        code: normalizedCode,
        minecraftUuid: normalizedUuid,
        minecraftUsername: trimmedUsername,
        ipAddress,
        success: false,
        reason: mojangVerification.reason || "MOJANG_VERIFICATION_FAILED",
      });
      return {
        success: false,
        message: "L'UUID et le pseudo ne correspondent pas au compte officiel Minecraft.",
        error: "MOJANG_MISMATCH",
      };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if UUID is already linked to another user
      const existingUserWithUuid = await tx.user.findUnique({
        where: { minecraftUuid: normalizedUuid },
        select: { id: true, discordUsername: true },
      });

      // 2. Lookup auth code
      const authCode = await tx.minecraftAuthCode.findUnique({
        where: { code: normalizedCode },
        include: { user: true },
      });

      const now = new Date();

      if (!authCode) {
        throw new Error("CODE_NOT_FOUND");
      }

      if (authCode.usedAt) {
        throw new Error("CODE_ALREADY_USED");
      }

      if (authCode.expiresAt < now) {
        throw new Error("CODE_EXPIRED");
      }

      if (existingUserWithUuid && existingUserWithUuid.id !== authCode.userId) {
        throw new Error("UUID_ALREADY_LINKED");
      }

      // 3. Invalidate / mark code as used
      await tx.minecraftAuthCode.update({
        where: { id: authCode.id },
        data: { usedAt: now },
      });

      // 4. Update user with Minecraft credentials & WAITLIST status
      const updatedUser = await tx.user.update({
        where: { id: authCode.userId },
        data: {
          minecraftUuid: normalizedUuid,
          minecraftUsername: trimmedUsername,
          registrationStatus: RegistrationStatus.WAITLIST,
        },
      });

      // 5. Add to RegistrationStatusHistory
      await tx.registrationStatusHistory.create({
        data: {
          userId: authCode.userId,
          authorId: authCode.userId,
          status: RegistrationStatus.WAITLIST,
        },
      });

      // 6. Record successful audit attempt
      await tx.minecraftAuthAttempt.create({
        data: {
          code: normalizedCode,
          minecraftUuid: normalizedUuid,
          minecraftUsername: trimmedUsername,
          ipAddress,
          success: true,
          reason: "SUCCESS",
          userId: authCode.userId,
        },
      });

      return { user: updatedUser };
    });

    return {
      success: true,
      message: "Compte Minecraft lié avec succès ! Ton statut passe en liste d'attente.",
      minecraftUsername: trimmedUsername,
    };
  } catch (error: any) {
    const reason = error?.message || "TRANSACTION_FAILED";

    await logAttempt({
      code: normalizedCode,
      minecraftUuid: normalizedUuid,
      minecraftUsername: trimmedUsername,
      ipAddress,
      success: false,
      reason,
    });

    if (reason === "UUID_ALREADY_LINKED") {
      return {
        success: false,
        message: "Ce compte Minecraft est déjà associé à un autre utilisateur.",
        error: "UUID_ALREADY_LINKED",
      };
    }

    if (reason === "CODE_EXPIRED" || reason === "CODE_ALREADY_USED" || reason === "CODE_NOT_FOUND") {
      return {
        success: false,
        message: "Code invalide ou expiré. Génère un nouveau code sur le site.",
        error: "INVALID_OR_EXPIRED_CODE",
      };
    }

    return {
      success: false,
      message: "Une erreur est survenue lors de la validation.",
      error: "SERVER_ERROR",
    };
  }
}

async function logAttempt(data: {
  code?: string;
  minecraftUuid?: string;
  minecraftUsername?: string;
  ipAddress?: string;
  success: boolean;
  reason: string;
  userId?: string;
}) {
  try {
    await prisma.minecraftAuthAttempt.create({
      data: {
        code: data.code,
        minecraftUuid: data.minecraftUuid,
        minecraftUsername: data.minecraftUsername,
        ipAddress: data.ipAddress,
        success: data.success,
        reason: data.reason,
        userId: data.userId,
      },
    });
  } catch {
    // Non-blocking log failure
  }
}
