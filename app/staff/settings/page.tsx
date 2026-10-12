import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { getGalleryCategoriesConfig } from "@/lib/gallery-category-config";
import { SettingsForm } from "@/components/staff/settings-form";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  await requireRole([Role.ADMIN]);
  const [settings, discordTemplates, galleryCategories] = await Promise.all([
    getGlobalSettings(),
    prisma.discordNotificationTemplate.findMany({
      select: {
        id: true,
        enabled: true,
        title: true,
        description: true,
        buttonLabel: true,
        buttonUrl: true,
        channelId: true,
        roleId: true,
      },
    }),
    getGalleryCategoriesConfig(),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Paramètres</h1>
      </div>

      <SettingsForm
        defaultValues={settings}
        initialDiscordTemplates={discordTemplates}
        initialGalleryCategories={galleryCategories}
      />
    </div>
  );
}
