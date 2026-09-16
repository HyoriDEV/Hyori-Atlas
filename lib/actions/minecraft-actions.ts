"use server";

import { prisma } from "@/lib/prisma";
import { requireActivePlayer } from "@/lib/dal";
import { getOrCreateActiveMinecraftAuthCode } from "@/lib/services/minecraft-service";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function getMinecraftStatusAction() {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  const isLinked = Boolean(user.minecraftUuid);
  let activeCode = null;

  if (!isLinked) {
    const codeRecord = await getOrCreateActiveMinecraftAuthCode(user.id);
    if (codeRecord) {
      activeCode = {
        code: codeRecord.code,
        expiresAt: codeRecord.expiresAt.toISOString(),
      };
    }
  }

  return {
    linked: isLinked,
    minecraftUuid: user.minecraftUuid,
    minecraftUsername: user.minecraftUsername,
    activeCode,
    settings: {
      serverAddress: settings.minecraftServerAddress,
      serverVersion: settings.minecraftServerVersion,
      authCommand: "auth",
    },
  };
}

export async function refreshMySkinAction() {
  const user = await requireActivePlayer();
  if (!user.minecraftUuid) {
    return { success: false, error: "Aucun compte Minecraft lié." };
  }

  // Cooldown check (2 minutes)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { minecraftSkinUpdatedAt: true },
  });

  if (dbUser?.minecraftSkinUpdatedAt) {
    const elapsedMs = Date.now() - dbUser.minecraftSkinUpdatedAt.getTime();
    const cooldownMs = 2 * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return {
        success: false,
        error: `Veuillez patienter encore ${remainingSec} secondes avant de synchroniser à nouveau.`,
      };
    }
  }

  const { syncUserMinecraftSkin } = await import("@/lib/services/minecraft-skin-service");
  const result = await syncUserMinecraftSkin(user.id, { force: true });

  return result;
}

export async function refreshAllSkinsStaffAction() {
  const user = await requireActivePlayer();
  if (user.role === "PLAYER") {
    return { success: false, error: "Accès non autorisé." };
  }

  const { syncAllMinecraftSkins } = await import("@/lib/services/minecraft-skin-service");
  const summary = await syncAllMinecraftSkins({ maxAgeMinutes: 0 });

  return { success: true, summary };
}
