import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

import {
  DEFAULT_DISCORD_TEMPLATES,
  type DefaultTemplateConfig,
  type DiscordTemplateId,
} from "@/lib/discord-template-constants";

export { DEFAULT_DISCORD_TEMPLATES, type DefaultTemplateConfig, type DiscordTemplateId };

export const getDiscordNotificationTemplates = cache(async () => {
  const templates = await prisma.discordNotificationTemplate.findMany();
  const map = new Map<string, (typeof templates)[number]>();
  for (const t of templates) {
    map.set(t.id, t);
  }
  return map;
});

/**
 * Récupère les paramètres d'une notification envoyée dans un salon Discord
 * (salon cible, rôle mentionné, état d'activation).
 * Aucun format n'est personnalisé ici : les embeds sont entièrement définis dans HyoriBot.
 */
export async function getChannelNotificationConfig(templateId: DiscordTemplateId) {
  const templatesMap = await getDiscordNotificationTemplates();
  const record = templatesMap.get(templateId);

  const enabled = record ? record.enabled : true;
  let channelId = record?.channelId?.trim() || null;
  const mentionRoleId = record?.roleId?.trim() || null;

  // Si c'est une alerte du salon unique #admissions et que le channelId n'est pas renseigné individuellement,
  // on hérite du channelId configuré sur le salon #admissions (ex: WAITLIST_REGISTRATION ou autre)
  if (
    !channelId &&
    (templateId === "WAITLIST_REGISTRATION" ||
      templateId === "CHARACTER_SHEET_SUBMITTED" ||
      templateId === "INTERVIEW_SLOT_BOOKED")
  ) {
    const admissionsChannel =
      templatesMap.get("WAITLIST_REGISTRATION")?.channelId?.trim() ||
      templatesMap.get("CHARACTER_SHEET_SUBMITTED")?.channelId?.trim() ||
      templatesMap.get("INTERVIEW_SLOT_BOOKED")?.channelId?.trim() ||
      null;
    if (admissionsChannel) {
      channelId = admissionsChannel;
    }
  }

  return {
    enabled,
    channelId,
    mentionRoleId,
  };
}

/**
 * Alias de compatibilité pour les notifications de tickets.
 */
export const getTicketChannelNotificationConfig = getChannelNotificationConfig;
