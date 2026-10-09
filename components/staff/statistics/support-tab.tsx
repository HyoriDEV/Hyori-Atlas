import { TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { getSupportStats } from "@/lib/services/statistics/support-stats";
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
  color: CHART_COLORS[index],
}));

export async function SupportTab({ range }: { range: StatisticsRange }) {
  const stats = await getSupportStats(range);
  const { tickets } = stats;

  return (
    <div className="flex flex-col gap-8">
      <StatisticsSection title="Tickets">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <StatTile label="Ouverts" value={formatNumber(tickets.open)} hint="non archivés" />
          <StatTile
            label="En attente du staff"
            value={formatNumber(tickets.pendingStaff)}
            hint="à traiter"
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
            hint="ouverts, créés sur la période"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={`Tickets créés ${describeGranularity(tickets.granularity)}`}>
            <TimeSeriesChart data={tickets.timeline} series={ticketSeries} stacked />
          </ChartCard>
          <ChartCard title="Par catégorie" description="Tickets créés sur la période.">
            <BarList
              items={tickets.byCategory}
              showShare
              emptyLabel="Aucun ticket sur cette période."
            />
          </ChartCard>
        </div>
      </StatisticsSection>
    </div>
  );
}
