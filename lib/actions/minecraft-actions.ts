"use server";

import { requireActivePlayer } from "@/lib/dal";
import {
  getOrCreateActiveMinecraftAuthCode,
} from "@/lib/services/minecraft-service";
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

