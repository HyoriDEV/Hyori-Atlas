"use client";

import { ViewTabs } from "@/components/dashboard/view-tabs";
import {
  DEFAULT_STATISTICS_PERIOD,
  STATISTICS_PERIODS,
  statisticsPeriodLabels,
  type StatisticsPeriod,
} from "@/lib/statistics";

const periodItems = STATISTICS_PERIODS.map((value) => ({
  value,
  label: statisticsPeriodLabels[value],
}));

export function PeriodSelect({ period }: { period: StatisticsPeriod }) {
  return (
    <ViewTabs
      activeView={period}
      defaultView={DEFAULT_STATISTICS_PERIOD}
      tabs={periodItems}
      paramName="period"
    />
  );
}
