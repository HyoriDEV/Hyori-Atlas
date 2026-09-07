import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { SettingsForm } from "@/components/staff/settings-form";

export default async function SettingsPage() {
  await requireRole([Role.ADMIN]);
  const settings = await getGlobalSettings();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Configuration globale des modules et services de l&apos;application.
        </p>
      </div>

      <SettingsForm defaultValues={settings} />
    </div>
  );
}

