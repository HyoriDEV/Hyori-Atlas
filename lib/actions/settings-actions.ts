"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { updateGlobalSettings } from "@/lib/services/settings-service";

export async function saveGlobalSettingsAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN]);

  const registrationEnabled = formData.get("registrationEnabled") === "true";
  const interviewBookingEnabled = formData.get("interviewBookingEnabled") === "true";
  const ticketCreationEnabled = formData.get("ticketCreationEnabled") === "true";
  const rpTrackingAccessEnabled = formData.get("rpTrackingAccessEnabled") === "true";
  const chapterWritingEnabled = formData.get("chapterWritingEnabled") === "true";
  const bdaReportSubmissionEnabled = formData.get("bdaReportSubmissionEnabled") === "true";

  const rawAddress = (formData.get("minecraftServerAddress") as string)?.trim();
  const rawVersion = (formData.get("minecraftServerVersion") as string)?.trim();
  const rawCommand = (formData.get("minecraftAuthCommand") as string)?.trim().replace(/^\//, "");

  const minecraftServerAddress = rawAddress || "auth.hyori-rp.fr";
  const minecraftServerVersion = rawVersion || "1.21.11";
  const minecraftAuthCommand = rawCommand ? rawCommand.toLowerCase() : "auth";

  // Compte à rebours & Vidéo
  const countdownEnabled = formData.get("countdownEnabled") === "true";
  const countdownBadgeText =
    (formData.get("countdownBadgeText") as string)?.trim() || "Hyori RP — Lancement Officiel";
  const countdownTitle =
    (formData.get("countdownTitle") as string)?.trim() || "Lancement Officiel de Hyori RP";
  const countdownSubtitle = (formData.get("countdownSubtitle") as string)?.trim() || "";
  const rawTargetDate = (formData.get("countdownTargetDate") as string)?.trim();
  const countdownTargetDate = rawTargetDate ? new Date(rawTargetDate) : null;
  const countdownVideoType = (
    (formData.get("countdownVideoType") as string)?.trim() || "URL"
  ).toUpperCase();
  const countdownVideoUrl = (formData.get("countdownVideoUrl") as string)?.trim() || null;
  const countdownDiscordUrl =
    (formData.get("countdownDiscordUrl") as string)?.trim() || "https://discord.gg/hyori";

  // Pages Publiques
  const publicNewsEnabled = formData.get("publicNewsEnabled") === "true";
  const publicRulesEnabled = formData.get("publicRulesEnabled") === "true";
  const publicLoreEnabled = formData.get("publicLoreEnabled") === "true";
  const publicGalleryEnabled = formData.get("publicGalleryEnabled") === "true";

  await updateGlobalSettings(
    {
      registrationEnabled,
      interviewBookingEnabled,
      ticketCreationEnabled,
      rpTrackingAccessEnabled,
      chapterWritingEnabled,
      bdaReportSubmissionEnabled,
      minecraftServerAddress,
      minecraftServerVersion,
      minecraftAuthCommand,
      publicNewsEnabled,
      publicRulesEnabled,
      publicLoreEnabled,
      publicGalleryEnabled,
      ...({
        countdownEnabled,
        countdownBadgeText,
        countdownTitle,
        countdownSubtitle,
        countdownTargetDate,
        countdownVideoType,
        countdownVideoUrl,
        countdownDiscordUrl,
      } as Record<string, unknown>),
    },
    user.id
  );

  revalidatePath("/", "layout");
  revalidatePath("/news");
  revalidatePath("/rules");
  revalidatePath("/lore");
  revalidatePath("/gallery");
  revalidatePath("/staff/settings");

  return { success: true };
}

export interface DiscordTemplateInput {
  id: string;
  enabled: boolean;
  channelId?: string | null;
  roleId?: string | null;
  title?: string | null;
  description?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
}

export async function saveDiscordTemplatesAction(
  templates: DiscordTemplateInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole([Role.ADMIN]);

    for (const item of templates) {
      await prisma.discordNotificationTemplate.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          enabled: item.enabled,
          channelId: item.channelId?.trim() || null,
          roleId: item.roleId?.trim() || null,
          title: item.title?.trim() || null,
          description: item.description?.trim() || null,
          buttonLabel: item.buttonLabel?.trim() || null,
          buttonUrl: item.buttonUrl?.trim() || null,
          updatedById: user.id,
        },
        update: {
          enabled: item.enabled,
          channelId: item.channelId?.trim() || null,
          roleId: item.roleId?.trim() || null,
          title: item.title?.trim() || null,
          description: item.description?.trim() || null,
          buttonLabel: item.buttonLabel?.trim() || null,
          buttonUrl: item.buttonUrl?.trim() || null,
          updatedById: user.id,
        },
      });
    }

    revalidatePath("/staff/settings");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde des modèles";
    return { success: false, error: message };
  }
}
