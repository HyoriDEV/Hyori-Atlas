import { getAdmissionStats } from "@/lib/services/statistics/admission-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, formatPercent, pluralize } from "@/lib/statistics-format";
import { formatDuration } from "@/lib/text-stats";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/staff/statistics/bar-list";
import { ChartCard, StatisticsSection } from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

export async function PlayerJourneyTab({ range }: { range: StatisticsRange }) {
  const stats = await getAdmissionStats(range);
  const { totals, postAdmission, sheets } = stats;

  const pendingStaffSheets =
    sheets.byStatus.find((s) => s.label.toLowerCase().includes("staff"))?.value ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs principaux d'onboarding */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <StatTile
          label="Comptes inscrits"
          value={formatNumber(totals.registered)}
          hint="inscriptions globales"
        />
        <StatTile
          label="Membres whitelistés"
          value={formatNumber(totals.whitelisted)}
          hint={
            totals.registered > 0
              ? `${formatPercent(totals.whitelisted / totals.registered)} des inscrits`
              : undefined
          }
        />
        <StatTile
          label="Fiches à relire"
          value={formatNumber(pendingStaffSheets)}
          hint="en attente d'avis staff"
          className={pendingStaffSheets > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}
        />
        <StatTile
          label="Conversion en jeu"
          value={formatPercent(postAdmission.conversionRate)}
          hint={`${postAdmission.connectedCount} sur ${postAdmission.whitelistedTotal} whitelistés ont joué`}
          className={
            postAdmission.conversionRate && postAdmission.conversionRate >= 0.7
              ? "border-emerald-500/30 bg-emerald-500/5"
              : ""
          }
        />
        <StatTile
          label="Taux d'acceptation"
          value={formatPercent(totals.acceptanceRate)}
          hint="dossiers acceptés / tranchés"
        />
      </div>

      {/* Entonnoir et goulots d'étranglement */}
      <StatisticsSection title="Entonnoir d'admission et Délais">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Répartition par étape du pipeline"
            description="État actuel de tous les dossiers d'inscription."
          >
            <BarList items={stats.funnel} showShare />
          </ChartCard>

          <ChartCard
            title="Délais réels entre étapes"
            description="Temps moyen constaté pour franchir chaque jalon d'admission."
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
      </StatisticsSection>

      {/* Traitement des fiches et Conversion post-admission */}
      <StatisticsSection title="Traitement des fiches et Passage en jeu">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="État des fiches de personnage"
            description={
              sheets.averageReviewRounds !== null
                ? `Moyenne de ${formatNumber(sheets.averageReviewRounds, 1)} demande(s) de révision avant validation.`
                : "Répartition des fiches actives."
            }
          >
            <BarList items={sheets.byStatus} showShare />
          </ChartCard>

          <ChartCard
            title="Conversion post-whitelist"
            description="Mesure de l'entrée effective des joueurs whitelistés sur le serveur."
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-3 text-sm">
                <span className="text-muted-foreground">Whitelistés ayant joué en jeu</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(postAdmission.connectedCount)} ({formatPercent(postAdmission.conversionRate)})
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Whitelistés n&apos;ayant jamais joué</span>
                <span className="font-semibold text-destructive">
                  {formatNumber(postAdmission.neverConnectedCount)} ({formatPercent(
                    postAdmission.whitelistedTotal > 0
                      ? postAdmission.neverConnectedCount / postAdmission.whitelistedTotal
                      : 0
                  )})
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted flex">
                <div
                  className="bg-primary h-full transition-all"
                  style={{
                    width: `${Math.round((postAdmission.conversionRate ?? 0) * 100)}%`,
                  }}
                  title="Connectés"
                />
                <div
                  className="bg-destructive/40 h-full transition-all"
                  style={{
                    width: `${Math.round(
                      ((postAdmission.whitelistedTotal > 0
                        ? postAdmission.neverConnectedCount / postAdmission.whitelistedTotal
                        : 0) * 100)
                    )}%`,
                  }}
                  title="Jamais connectés"
                />
              </div>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title={`Flux d'inscriptions et de whitelistages ${describeGranularity(stats.granularity)}`}
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
