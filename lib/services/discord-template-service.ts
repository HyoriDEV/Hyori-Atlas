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
  const channelId = record?.channelId?.trim() || null;
  const mentionRoleId = record?.roleId?.trim() || null;

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
