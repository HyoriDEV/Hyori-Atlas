"use server";

import { requireRole } from "@/lib/dal";
import {
  CharacterClass,
  CharacterSheetStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  checkBotHealth,
  notifyPlayerCharacterSheetStatus,
  notifyPlayerRegistrationStatus,
  syncPlayerWhitelistClassRole,
  type BotHealthResponse,
  type BotNotificationResult,
  type BotRoleSyncResult,
  type CharacterSheetNotificationStatus,
} from "@/lib/services/discord-bot-service";

export async function testBotHealthAction(): Promise<BotHealthResponse> {
  await requireRole([Role.ADMIN]);
  return checkBotHealth();
}

export async function testRegistrationNotificationAction(
  targetDiscordId: string,
  status: RegistrationStatus
): Promise<BotNotificationResult> {
  await requireRole([Role.ADMIN]);

  const cleanDiscordId = targetDiscordId.trim();
  if (!cleanDiscordId || !/^\d{16,21}$/.test(cleanDiscordId)) {
    return {
      success: false,
      notified: false,
      error: "ID Discord invalide (doit comporter entre 16 et 21 chiffres).",
    };
  }

  return notifyPlayerRegistrationStatus(cleanDiscordId, status);
}

export async function testCharacterSheetNotificationAction(
  targetDiscordId: string,
  status: CharacterSheetNotificationStatus
): Promise<BotNotificationResult> {
  await requireRole([Role.ADMIN]);

  const cleanDiscordId = targetDiscordId.trim();
  if (!cleanDiscordId || !/^\d{16,21}$/.test(cleanDiscordId)) {
    return {
      success: false,
      notified: false,
      error: "ID Discord invalide (doit comporter entre 16 et 21 chiffres).",
    };
  }

  return notifyPlayerCharacterSheetStatus(cleanDiscordId, status);
}

export async function testRoleSyncAction(
  targetDiscordId: string,
  classRole: CharacterClass
): Promise<BotRoleSyncResult> {
  await requireRole([Role.ADMIN]);

  const cleanDiscordId = targetDiscordId.trim();
  if (!cleanDiscordId || !/^\d{16,21}$/.test(cleanDiscordId)) {
    return {
      success: false,
      whitelisted: false,
      classRole,
      error: "ID Discord invalide (doit comporter entre 16 et 21 chiffres).",
    };
  }

  return syncPlayerWhitelistClassRole(cleanDiscordId, true, classRole);
}
