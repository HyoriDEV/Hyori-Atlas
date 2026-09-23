"use server";

import { requireRole } from "@/lib/dal";
import { CharacterClass, RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import {
  checkBotHealth,
  notifyPlayerCharacterSheetStatus,
  notifyPlayerRegistrationStatus,
  notifyPlayerTicketMessage,
  sendInterviewReminders,
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

export async function testInterviewReminderAction(
  targetDiscordId: string
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

  const result = await sendInterviewReminders([cleanDiscordId]);
  return {
    success: result.success && result.sent > 0,
    notified: result.sent > 0,
    dmClosed: result.dmClosed > 0,
    message:
      result.message ||
      (result.sent > 0 ? "Notification de relance d'entretien envoyée avec succès !" : undefined),
    error: result.errors?.join(", ") || result.error,
  };
}

export async function testTicketNotificationAction(
  targetDiscordId: string
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

  return notifyPlayerTicketMessage({
    discordId: cleanDiscordId,
    ticketId: "test-ticket",
    ticketSubject: "Question RP — Test de notification",
    authorName: "Équipe Staff (Test)",
    messagePreview:
      "Ceci est un test de notification Discord suite à un nouveau message sur votre ticket.",
  });
}
