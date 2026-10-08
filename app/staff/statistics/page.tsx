import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Statistiques",
};
import { staffStatisticsItem } from "@/lib/navigation";
import {
  DEFAULT_STATISTICS_PERIOD,
  DEFAULT_STATISTICS_TAB,
  STATISTICS_PERIODS,
  STATISTICS_TABS,
  statisticsTabLabels,
  type StatisticsPeriod,
  type StatisticsTab,
} from "@/lib/statistics";
import { resolveStatisticsRange } from "@/lib/services/statistics/timeline";
import { getServerPagePrefs, checkRedirectWithSavedPrefs } from "@/lib/table-preferences";
import { ViewTabs } from "@/components/dashboard/view-tabs";
import { AdmissionTab } from "@/components/staff/statistics/admission-tab";
import { CharactersTab } from "@/components/staff/statistics/characters-tab";
import { GameActivityTab } from "@/components/staff/statistics/game-activity-tab";
import { PeriodSelect } from "@/components/staff/statistics/period-select";
import { SupportTab } from "@/components/staff/statistics/support-tab";

export default async function StatisticsStaffPage(props: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  await requireRole(staffStatisticsItem.roles);
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, staffStatisticsItem.href);
  const redirectUrl = checkRedirectWithSavedPrefs(
    staffStatisticsItem.href,
    searchParams,
    savedPrefs
  );
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const tab: StatisticsTab = STATISTICS_TABS.includes(searchParams.tab as StatisticsTab)
    ? (searchParams.tab as StatisticsTab)
    : DEFAULT_STATISTICS_TAB;
  const period: StatisticsPeriod = STATISTICS_PERIODS.includes(
    searchParams.period as StatisticsPeriod
  )
    ? (searchParams.period as StatisticsPeriod)
    : DEFAULT_STATISTICS_PERIOD;
  const range = resolveStatisticsRange(period);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Statistiques</h1>
        <PeriodSelect period={period} />
      </div>

      <ViewTabs
        activeView={tab}
        defaultView={DEFAULT_STATISTICS_TAB}
        tabs={STATISTICS_TABS.map((value) => ({ value, label: statisticsTabLabels[value] }))}
      />

      {/* Seul l'onglet affiché calcule ses statistiques. */}
      {tab === "communaute" && <AdmissionTab range={range} />}
      {tab === "activite" && <GameActivityTab range={range} />}
      {tab === "ecriture" && <CharactersTab range={range} />}
      {tab === "staff" && <SupportTab range={range} />}
    </div>
  );
}
