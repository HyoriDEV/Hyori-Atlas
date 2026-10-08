import { SanctionType, TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { RP_TRACKING_STATES, rpTrackingStateLabels } from "@/lib/rp-tracking";
import { getSupportStats, sanctionTypeLabels } from "@/lib/services/statistics/support-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, pluralize } from "@/lib/statistics-format";
import { formatDuration } from "@/lib/text-stats";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/staff/statistics/bar-list";
import { ChartCard, StatisticsSection } from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

// Chaque série garde sa couleur quel que soit le filtre : l'ordre suit celui des enums.
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

const sanctionSeries = Object.values(SanctionType).map((type, index) => ({
  key: type,
  label: sanctionTypeLabels[type],
  color: CHART_COLORS[index],
}));

export async function SupportTab({ range }: { range: StatisticsRange }) {
  const stats = await getSupportStats(range);
  const { tickets, rpTracking, sanctions, bdaReports } = stats;

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

      <StatisticsSection title="Suivi RP">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="État des suivis"
            description="État actuel des joueurs whitelistés, indépendant de la période choisie."
          >
            <BarList
              items={RP_TRACKING_STATES.map((state) => ({
                label: rpTrackingStateLabels[state],
                value: rpTracking.counts[state],
              }))}
              showShare
              emptyLabel="Aucun joueur whitelisté."
            />
          </ChartCard>
          <ChartCard
            title="Échanges sur la période"
            description={`Délai moyen de réponse du staff : ${formatDuration(rpTracking.meanReplyMs)} (${pluralize(rpTracking.repliesCount, "réponse")}).`}
          >
            <BarList
              items={[
                { label: "Messages des joueurs", value: rpTracking.playerMessages },
                { label: "Messages du staff", value: rpTracking.staffMessages },
              ]}
              emptyLabel="Aucun échange sur cette période."
            />
          </ChartCard>
        </div>
      </StatisticsSection>

      <StatisticsSection title="Sanctions et rapports GC">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatTile label="Sanctions sur la période" value={formatNumber(sanctions.inPeriod)} />
          <StatTile
            label="Dont révoquées"
            value={formatNumber(sanctions.revokedInPeriod)}
            hint="levées par le staff"
          />
          <StatTile
            label="Exclusions et suspensions en cours"
            value={formatNumber(sanctions.activeNow)}
            hint="à cet instant"
          />
          <StatTile
            label="Rapports GC créés"
            value={formatNumber(bdaReports.createdInPeriod)}
            hint="sur la période"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={`Sanctions ${describeGranularity(sanctions.granularity)}`}>
            <TimeSeriesChart data={sanctions.timeline} series={sanctionSeries} stacked />
          </ChartCard>
          <div className="flex flex-col gap-4">
            <ChartCard title="Origine des sanctions" description="Sanctions de la période.">
              <BarList
                items={sanctions.bySource}
                showShare
                emptyLabel="Aucune sanction sur cette période."
              />
            </ChartCard>
            <ChartCard title="Rapports GC par statut" description="Tous les rapports existants.">
              <BarList items={bdaReports.byStatus} showShare emptyLabel="Aucun rapport GC." />
            </ChartCard>
          </div>
        </div>
      </StatisticsSection>
    </div>
  );
}
