// Valeurs des paramètres d'URL de la page Statistiques, partagées entre la page (serveur)
// et ses contrôles (client).

export const STATISTICS_TABS = ["communaute", "activite", "ecriture", "staff"] as const;

export type StatisticsTab = (typeof STATISTICS_TABS)[number];

export const DEFAULT_STATISTICS_TAB: StatisticsTab = "communaute";

export const statisticsTabLabels: Record<StatisticsTab, string> = {
  communaute: "Communauté",
  activite: "Activité",
  ecriture: "Écriture",
  staff: "Staff",
};

export const STATISTICS_PERIODS = ["7", "30", "90", "all"] as const;

export type StatisticsPeriod = (typeof STATISTICS_PERIODS)[number];

export const DEFAULT_STATISTICS_PERIOD: StatisticsPeriod = "all";

export const statisticsPeriodLabels: Record<StatisticsPeriod, string> = {
  "7": "7 derniers jours",
  "30": "30 derniers jours",
  "90": "90 derniers jours",
  all: "Depuis le début",
};
