import { formatDate } from "@/lib/date";
import { getGameActivityStats } from "@/lib/services/statistics/game-activity-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber } from "@/lib/statistics-format";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ChartCard, StatisticsSection } from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";
import { ActivityHeatmap } from "@/components/staff/statistics/activity-heatmap";

export async function GameActivityTab({ range }: { range: StatisticsRange }) {
  const stats = await getGameActivityStats(range);
  const { totals } = stats;

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs épurés */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatTile
          label="Pic de joueurs simultanés"
          value={formatNumber(totals.peakConcurrent)}
          hint={
            totals.peakAt
              ? formatDate(totals.peakAt, { style: "prefix-short", withYear: true })
              : undefined
          }
        />
        <StatTile
          label="Joueurs uniques connectés"
          value={formatNumber(totals.uniquePlayers)}
          hint="sur la période sélectionnée"
        />
        <StatTile
          label="Volume d'heures jouées"
          value={`${formatNumber(totals.hoursPlayed, totals.hoursPlayed < 100 ? 1 : 0)} h`}
          hint="cumulé tous joueurs confondus"
        />
      </div>

      {/* Courbes temporelles de fréquentation */}
      <StatisticsSection title="Fréquentation et Dynamique">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title={`Affluence de joueurs ${describeGranularity(stats.granularity)}`}
            description="Nombre de joueurs distincts connectés par tranche temporelle."
          >
            <TimeSeriesChart
              data={stats.timeline}
              series={[{ key: "players", label: "Joueurs distincts", color: "var(--chart-1)" }]}
              kind="line"
            />
          </ChartCard>

          <ChartCard
            title={`Heures-joueurs ${describeGranularity(stats.granularity)}`}
            description="Volume total d'heures passées en jeu."
          >
            <TimeSeriesChart
              data={stats.timeline}
              series={[{ key: "hours", label: "Heures jouées", color: "var(--chart-2)" }]}
              allowDecimals
            />
          </ChartCard>
        </div>
      </StatisticsSection>

      {/* Heatmap hebdomadaire des créneaux actifs */}
      <StatisticsSection title="Habitudes de jeu et Créneaux actifs">
        <ChartCard
          title="Affluence moyenne hebdomadaire"
          description="Présence moyenne par jour de la semaine et tranche horaire (heure de Paris). Idéal pour caler vos scènes RP et animations."
        >
          <ActivityHeatmap values={stats.heatmap} />
        </ChartCard>
      </StatisticsSection>
    </div>
  );
}
