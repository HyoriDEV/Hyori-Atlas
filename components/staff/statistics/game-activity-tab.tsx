import Link from "next/link";

import { formatDate } from "@/lib/date";
import { getGameActivityStats } from "@/lib/services/statistics/game-activity-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, formatPercent } from "@/lib/statistics-format";
import { formatDuration } from "@/lib/text-stats";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  ChartCard,
  ChartEmptyState,
  StatisticsSection,
} from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

export async function GameActivityTab({ range }: { range: StatisticsRange }) {
  const stats = await getGameActivityStats(range);
  const { totals } = stats;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <StatTile
          label="Heures jouées"
          value={`${formatNumber(totals.hoursPlayed, totals.hoursPlayed < 100 ? 1 : 0)} h`}
          hint="tous joueurs confondus"
        />
        <StatTile
          label="Joueurs uniques"
          value={formatNumber(totals.uniquePlayers)}
          hint="connectés au moins une fois"
        />
        <StatTile
          label="Sessions"
          value={formatNumber(totals.sessions)}
          hint={
            totals.uniquePlayers > 0
              ? `${formatNumber(totals.sessions / totals.uniquePlayers, 1)} par joueur`
              : undefined
          }
        />
        <StatTile
          label="Durée moyenne d'une session"
          value={formatDuration(totals.meanSessionMs)}
        />
        <StatTile
          label="Pic de joueurs simultanés"
          value={formatNumber(totals.peakConcurrent)}
          hint={
            totals.peakAt
              ? formatDate(totals.peakAt, { style: "prefix-short", withYear: true })
              : undefined
          }
        />
      </div>

      <StatisticsSection title="Fréquentation">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={`Heures jouées ${describeGranularity(stats.granularity)}`}>
            <TimeSeriesChart
              data={stats.timeline}
              series={[{ key: "hours", label: "Heures jouées", color: "var(--chart-1)" }]}
              allowDecimals
            />
          </ChartCard>
          <ChartCard title={`Joueurs uniques ${describeGranularity(stats.granularity)}`}>
            <TimeSeriesChart
              data={stats.timeline}
              series={[{ key: "players", label: "Joueurs uniques", color: "var(--chart-1)" }]}
              kind="line"
            />
          </ChartCard>
        </div>

      </StatisticsSection>

      <StatisticsSection title="Joueurs">
        <div className="flex flex-col gap-4">
          <ChartCard
            title="Temps de jeu le plus élevé"
            description="Les dix joueurs les plus présents sur la période."
          >
            {stats.topPlayers.length === 0 ? (
              <ChartEmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead className="text-right">Temps de jeu</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topPlayers.map((player) => (
                    <TableRow key={player.key}>
                      <TableCell>
                        {player.userId ? (
                          <Link
                            href={`/staff/atlas/${player.userId}`}
                            className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                            title={`Voir la fiche Atlas de ${player.name}`}
                          >
                            <SkinHead size="sm" username={player.minecraftUsername} />
                            <span className="font-medium hover:underline">{player.name}</span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <SkinHead size="sm" username={player.minecraftUsername} />
                            <span className="font-medium">{player.name}</span>
                            <span className="text-muted-foreground text-xs">(compte non lié)</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(player.hours, 1)} h
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {formatNumber(player.sessions)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>

        </div>
      </StatisticsSection>
    </div>
  );
}
