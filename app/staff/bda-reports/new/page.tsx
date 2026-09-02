import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
import { BdaReportForm } from "@/components/dashboard/bda-report-form";

const bdaRoles = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export default async function NewBdaReportPage() {
  const currentUser = await requireRole(bdaRoles);
  const { getGlobalSettings } = await import("@/lib/services/settings-service");
  const settings = await getGlobalSettings();

  if (!settings.bdaReportSubmissionEnabled) {
    const { LockedFeatureCard } = await import("@/components/locked-feature-card");
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">Nouveau Rapport GC</h1>
          <p className="text-muted-foreground text-sm">
            Crée un nouveau dossier de litige et assigne les différentes parties.
          </p>
        </div>
        <LockedFeatureCard description="Un administrateur a temporairement désactivé la soumission de rapports." />
      </div>
    );
  }

  const [players, staffMembers, tickets] = await Promise.all([
    prisma.user.findMany({
      orderBy: { discordDisplayName: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: { in: bdaRoles },
      },
      orderBy: { discordDisplayName: "asc" },
    }),
    prisma.ticket.findMany({
      where: {
        category: TicketCategory.PLAYER_COMPLAINT,
        status: { not: TicketStatus.ARCHIVED },
      },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">Nouveau Rapport GC</h1>
        <p className="text-muted-foreground text-sm">
          Crée un nouveau dossier de litige et assigne les différentes parties.
        </p>
      </div>

      <BdaReportForm
        currentUser={currentUser}
        staffMembers={staffMembers}
        players={players}
        tickets={tickets}
      />
    </div>
  );
}
