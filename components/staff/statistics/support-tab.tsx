import { SanctionType, TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { getSupportStats, sanctionTypeLabels } from "@/lib/services/statistics/support-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, pluralize } from "@/lib/statistics-format";
import { formatDuration } from "@/lib/text-stats";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/staff/statistics/bar-list";
import { ChartCard, StatisticsSection } from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const ticketSeries = Object.values(TicketCategory).map((category, index) => ({
  key: category,
  label: ticketCategoryLabels[category],
  color: CHART_COLORS[index % CHART_COLORS.length],
}));

const sanctionSeries = Object.values(SanctionType).map((type, index) => ({
  key: type,
  label: sanctionTypeLabels[type],
  color: CHART_COLORS[index % CHART_COLORS.length],
}));

export async function SupportTab({ range }: { range: StatisticsRange }) {
  const stats = await getSupportStats(range);
  const { tickets, sanctions } = stats;

  return (
    <div className="flex flex-col gap-8">
      {/* 1. SECTION TICKETS & SUPPORT */}
      <StatisticsSection title="Charge de Support et Réactivité">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <StatTile label="Tickets ouverts" value={formatNumber(tickets.open)} hint="en cours" />
          <StatTile
            label="En attente du staff"
            value={formatNumber(tickets.pendingStaff)}
            hint="à traiter en priorité"
            className={tickets.pendingStaff > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}
          />
          <StatTile label="Créés sur la période" value={formatNumber(tickets.createdInPeriod)} />
          <StatTile
            label="Délai moyen de 1re réponse"
            value={formatDuration(tickets.meanFirstReplyMs)}
            hint={pluralize(tickets.repliedCount, "ticket répondu", "tickets répondus")}
          />
          <StatTile
            label="Sans réponse"
            value={formatNumber(tickets.unansweredCount)}
            hint="créés sur la période"
            className={tickets.unansweredCount > 0 ? "border-red-500/30 bg-red-500/5" : ""}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={`Tickets créés ${describeGranularity(tickets.granularity)}`}>
            <TimeSeriesChart data={tickets.timeline} series={ticketSeries} stacked />
          </ChartCard>
          <ChartCard title="Par catégorie" description="Répartition des demandes créées sur la période.">
            <BarList
              items={tickets.byCategory}
              showShare
              emptyLabel="Aucun ticket sur cette période."
            />
          </ChartCard>
        </div>
      </StatisticsSection>

      {/* 2. SECTION MODÉRATION & SANCTIONS */}
      <StatisticsSection title="Modération et Sanctions">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <StatTile
            label="Sanctions sur la période"
            value={formatNumber(sanctions.inPeriod)}
            hint="avertissements, suspensions, bans"
          />
          <StatTile
            label="Sanctions actuellement actives"
            value={formatNumber(sanctions.activeNow)}
            hint="joueurs temporairement ou définitivement sanctionnés"
          />
          <StatTile
            label="Sanctions révoquées"
            value={formatNumber(sanctions.revokedInPeriod)}
            hint="levées par le staff sur la période"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Typologie des sanctions" description="Répartition des sanctions émises.">
            <BarList
              items={sanctions.byType}
              showShare
              emptyLabel="Aucune sanction sur cette période."
            />
          </ChartCard>

          <ChartCard
            title={`Évolution des sanctions ${describeGranularity(sanctions.granularity)}`}
            description="Sanctions appliquées dans le temps."
          >
            <TimeSeriesChart data={sanctions.timeline} series={sanctionSeries} stacked />
          </ChartCard>
        </div>
      </StatisticsSection>
    </div>
  );
}
