import type { Metadata } from "next";

import { requireRole } from "@/lib/dal";
import { staffLogsItem } from "@/lib/navigation";
import { getLogServers, isPterodactylConfigured } from "@/lib/services/pterodactyl-logs";
import { Card } from "@/components/ui/card";
import { LogViewer } from "@/components/staff/logs/log-viewer";

export const metadata: Metadata = {
  title: "Logs serveur",
};

export default async function StaffLogsPage() {
  await requireRole(staffLogsItem.roles);
  const configured = isPterodactylConfigured();
  const servers = getLogServers().map(({ key, label }) => ({ key, label }));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Logs serveur</h1>
      </div>
      {configured ? (
        <LogViewer servers={servers} />
      ) : (
        <Card className="text-muted-foreground p-6 text-sm">
          <p>
          Accès Pterodactyl non configuré. Ajouter <code>PTERO_API_KEY</code> dans
          l&apos;environnement du site.
          </p>
        </Card>
      )}
    </div>
  );
}
