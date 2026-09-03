"use server";

import { revalidatePath } from "next/cache";
import { requireActivePlayer } from "@/lib/dal";
import {
  createMinecraftAuthCode,
  getActiveMinecraftAuthCode,
} from "@/lib/services/minecraft-service";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function generateMinecraftCodeAction() {
  const user = await requireActivePlayer();

  if (user.minecraftUuid) {
    return { success: false, message: "Ton compte Minecraft est déjà lié." };
  }

  try {
    const codeData = await createMinecraftAuthCode(user.id);
    revalidatePath("/player/getting-started");
    return {
      success: true,
      code: codeData.code,
      expiresAt: codeData.expiresAt.toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message === "ALREADY_LINKED"
        ? "Ton compte est déjà lié."
        : "Impossible de générer un code. Réessaie dans un instant.",
    };
  }
}

export async function getMinecraftStatusAction() {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  const isLinked = Boolean(user.minecraftUuid);
  let activeCode = null;

  if (!isLinked) {
    const codeRecord = await getActiveMinecraftAuthCode(user.id);
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
      authCommand: settings.minecraftAuthCommand,
    },
  };
}
