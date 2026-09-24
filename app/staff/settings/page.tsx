import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { SettingsForm } from "@/components/staff/settings-form";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  await requireRole([Role.ADMIN]);
  const [settings, discordTemplates] = await Promise.all([
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
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Configuration globale des modules et services de l&apos;application.
        </p>
      </div>

      <SettingsForm defaultValues={settings} initialDiscordTemplates={discordTemplates} />
    </div>
  );
}
