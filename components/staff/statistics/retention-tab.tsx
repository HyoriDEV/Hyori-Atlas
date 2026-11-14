import { getRetentionStats } from "@/lib/services/statistics/retention-stats";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatNumber } from "@/lib/statistics-format";
import { RetentionTableClient } from "@/components/staff/statistics/retention-table-client";

export async function RetentionTab() {
  const stats = await getRetentionStats();
  const { counts, thresholds, players } = stats;

  return (
    <div className="flex flex-col gap-6">
      {/* 4 KPIs clés d'alerte */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          label="Nouveaux fantômes"
          value={formatNumber(counts.ghostCount)}
          hint={`whitelistés ≥ ${thresholds.ghostDays}j sans session`}
          className={counts.ghostCount > 0 ? "border-purple-500/30 bg-purple-500/5" : ""}
        />
        <StatTile
          label="Décrochages sévères"
          value={formatNumber(counts.severeDropCount)}
          hint={`baisse ≥ ${thresholds.dropPercentage}% sur 7j`}
          className={counts.severeDropCount > 0 ? "border-red-500/30 bg-red-500/5" : ""}
        />
        <StatTile
          label="Absences anormales"
          value={formatNumber(counts.abnormalAbsenceCount)}
          hint={`joueurs établis absents ≥ ${thresholds.absenceDays}j`}
          className={counts.abnormalAbsenceCount > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}
        />
        <StatTile
          label="Inactifs confirmés"
          value={formatNumber(counts.confirmedInactiveCount)}
          hint={`sans connexion ≥ ${thresholds.inactiveDays}j`}
        />
      </div>

      {/* Tableau d'intervention prioritaire */}
      <RetentionTableClient players={players} totalWhitelisted={counts.totalWhitelisted} />
    </div>
  );
}
