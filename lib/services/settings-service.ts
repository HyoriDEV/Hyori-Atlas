import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getGlobalSettings = cache(async () => {
  let settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: "global" },
    });
  }

  type ExtendedSettings = import("@/lib/generated/prisma/client").GlobalSettings & {
    countdownEnabled?: boolean;
    countdownBadgeText?: string | null;
    countdownTitle?: string;
    countdownSubtitle?: string | null;
    countdownTargetDate?: Date | null;
    countdownVideoType?: string;
    countdownVideoUrl?: string | null;
    countdownDiscordUrl?: string | null;
    publicNewsEnabled?: boolean;
    publicRulesEnabled?: boolean;
    publicLoreEnabled?: boolean;
    publicGalleryEnabled?: boolean;
  };

  const s = settings as ExtendedSettings;

  return {
    ...settings,
    countdownEnabled: s.countdownEnabled ?? false,
    countdownBadgeText: s.countdownBadgeText || "Hyori RP — Lancement Officiel",
    countdownTitle: s.countdownTitle || "Lancement Officiel de Hyori RP",
    countdownSubtitle: s.countdownSubtitle ?? "Le compte à rebours est lancé. Préparez-vous à entrer dans l'histoire.",
    countdownTargetDate: s.countdownTargetDate ?? null,
    countdownVideoType: s.countdownVideoType || "URL",
    countdownVideoUrl: s.countdownVideoUrl ?? null,
    countdownDiscordUrl: s.countdownDiscordUrl || "https://discord.gg/hyori",
    publicNewsEnabled: s.publicNewsEnabled ?? true,
    publicRulesEnabled: s.publicRulesEnabled ?? true,
    publicLoreEnabled: s.publicLoreEnabled ?? true,
    publicGalleryEnabled: s.publicGalleryEnabled ?? true,
  };
});

export async function updateGlobalSettings(
  data: Partial<
    Omit<import("@/lib/generated/prisma/client").GlobalSettings, "id" | "updatedAt" | "updatedBy">
  >,
  userId: string
) {
  return await prisma.globalSettings.update({
    where: { id: "global" },
    data: {
      ...data,
      updatedById: userId,
    },
  });
}
