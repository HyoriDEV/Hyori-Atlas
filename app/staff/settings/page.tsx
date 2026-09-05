import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { SettingsForm } from "@/components/staff/settings-form";

export default async function SettingsPage() {
  await requireRole([Role.ADMIN]);
  const settings = await getGlobalSettings();

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres de l&apos;application</h1>
        <p className="text-muted-foreground mt-2">
          Gérez l&apos;activation et la désactivation des fonctionnalités globales. Attention, la
          désactivation d&apos;une fonctionnalité s&apos;applique à tous les utilisateurs (staff
          compris).
        </p>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6">
          <SettingsForm defaultValues={settings} />
        </div>
      </div>
    </div>
  );
}
