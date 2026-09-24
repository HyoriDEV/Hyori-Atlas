import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

import {
  DEFAULT_DISCORD_TEMPLATES,
  type DefaultTemplateConfig,
  type DiscordTemplateId,
} from "@/lib/discord-template-constants";

export { DEFAULT_DISCORD_TEMPLATES, type DefaultTemplateConfig, type DiscordTemplateId };

export function interpolateTemplateVariables(
  template: string,
  variables: Record<string, string | null | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const val = value ?? "";
    result = result.replaceAll(key, val);
  }
  return result;
}

export const getDiscordNotificationTemplates = cache(async () => {
  const templates = await prisma.discordNotificationTemplate.findMany();
  const map = new Map<string, (typeof templates)[number]>();
  for (const t of templates) {
    map.set(t.id, t);
  }
  return map;
});

export interface DiscordEmbedOverride {
  title?: string | null;
  description?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
}

/**
 * Récupère l'override dynamique configuré sur Atlas s'il existe et est activé.
 * Si aucun template n'est défini ou s'il n'y a pas d'override personnalisé, renvoie null
 * pour que le bot utilise son format codé en dur.
 */
export async function getEffectiveDiscordOverride(
  templateId: DiscordTemplateId,
  variables: Record<string, string | null | undefined>
): Promise<DiscordEmbedOverride | null> {
  const templatesMap = await getDiscordNotificationTemplates();
  const record = templatesMap.get(templateId);

  // Si désactivé ou absent, pas d'override
  if (!record || !record.enabled) {
    return null;
  }

  const hasTitle = Boolean(record.title?.trim());
  const hasDescription = Boolean(record.description?.trim());
  const hasButtonLabel = Boolean(record.buttonLabel?.trim());
  const hasButtonUrl = Boolean(record.buttonUrl?.trim());

  if (!hasTitle && !hasDescription && !hasButtonLabel && !hasButtonUrl) {
    return null;
  }

  return {
    title: hasTitle ? interpolateTemplateVariables(record.title!, variables) : undefined,
    description: hasDescription
      ? interpolateTemplateVariables(record.description!, variables)
      : undefined,
    buttonLabel: hasButtonLabel
      ? interpolateTemplateVariables(record.buttonLabel!, variables)
      : undefined,
    buttonUrl: hasButtonUrl
      ? interpolateTemplateVariables(record.buttonUrl!, variables)
      : undefined,
  };
}

/**
 * Récupère les paramètres d'ouverture de ticket (salon externe, rôle et override).
 */
export async function getTicketCreationNotificationConfig(
  variables: Record<string, string | null | undefined>
) {
  const templatesMap = await getDiscordNotificationTemplates();
  const record = templatesMap.get("TICKET_CREATED");

  const enabled = record ? record.enabled : true;
  const channelId = record?.channelId?.trim() || null;
  const mentionRoleId = record?.roleId?.trim() || null;
  const override = await getEffectiveDiscordOverride("TICKET_CREATED", variables);

  return {
    enabled,
    channelId,
    mentionRoleId,
    override,
  };
}
