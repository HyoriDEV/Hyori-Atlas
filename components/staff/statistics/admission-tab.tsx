import { getAdmissionStats } from "@/lib/services/statistics/admission-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, formatPercent, pluralize } from "@/lib/statistics-format";
import { formatDuration } from "@/lib/text-stats";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/staff/statistics/bar-list";
import { ChartCard, StatisticsSection } from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

export async function AdmissionTab({ range }: { range: StatisticsRange }) {
  const stats = await getAdmissionStats(range);
  const { totals } = stats;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <StatTile label="Inscrits" value={formatNumber(totals.registered)} hint="comptes créés" />
        <StatTile
          label="Whitelistés"
          value={formatNumber(totals.whitelisted)}
          hint={
            totals.registered > 0
              ? `${formatPercent(totals.whitelisted / totals.registered)} des inscrits`
              : undefined
          }
        />
        <StatTile
          label="Liste d'attente"
          value={formatNumber(totals.waitlist)}
          hint="à accepter ou refuser"
        />
        <StatTile
          label="En whitelist"
          value={formatNumber(totals.inProgress)}
          hint="fiche et entretien en cours"
        />
        <StatTile
          label="Taux d'acceptation"
          value={formatPercent(totals.acceptanceRate)}
          hint="whitelistés / dossiers tranchés"
        />
      </div>

      <StatisticsSection title="Parcours d'admission">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Répartition par statut"
            description="Où en sont aujourd'hui tous les comptes inscrits."
          >
            <BarList items={stats.funnel} showShare />
          </ChartCard>

          <ChartCard
            title="Délais moyens entre étapes"
            description="Joueurs arrivés à l'étape sur la période, d'après l'historique des statuts."
          >
            <ul className="divide-border flex flex-col divide-y">
              {stats.stageDelays.map((delay) => (
                <li
                  key={delay.label}
                  className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                >
                  <span className="text-foreground/90">{delay.label}</span>
                  <span className="text-right whitespace-nowrap">
                    <span className="text-foreground font-heading text-base font-semibold">
                      {formatDuration(delay.meanMs)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {pluralize(delay.sampleSize, "joueur")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>

        <ChartCard
          title={`Inscriptions et whitelistages ${describeGranularity(stats.granularity)}`}
          description={`${pluralize(stats.periodTotals.registrations, "inscription")} et ${pluralize(stats.periodTotals.whitelistings, "whitelistage")} sur la période.`}
        >
          <TimeSeriesChart
            data={stats.timeline}
            series={[
              { key: "registrations", label: "Inscriptions", color: "var(--chart-1)" },
              { key: "whitelistings", label: "Whitelistages", color: "var(--chart-2)" },
            ]}
          />
        </ChartCard>
      </StatisticsSection>
    </div>
  );
}
