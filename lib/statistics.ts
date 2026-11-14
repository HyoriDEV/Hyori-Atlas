// Valeurs des paramètres d'URL de la page Statistiques, partagées entre la page (serveur)
// et ses contrôles (client).

export const STATISTICS_TABS = ["retention", "activite", "parcours", "staff"] as const;

export type StatisticsTab = (typeof STATISTICS_TABS)[number];

export const DEFAULT_STATISTICS_TAB: StatisticsTab = "retention";

export const statisticsTabLabels: Record<StatisticsTab, string> = {
  retention: "Santé & Rétention",
  activite: "Fréquentation & Serveur",
  parcours: "Parcours Joueur",
  staff: "Pilotage Staff",
};

export const STATISTICS_PERIODS = ["7", "30", "90", "all"] as const;

export type StatisticsPeriod = (typeof STATISTICS_PERIODS)[number];

export const DEFAULT_STATISTICS_PERIOD: StatisticsPeriod = "all";

export const statisticsPeriodLabels: Record<StatisticsPeriod, string> = {
  "7": "7J",
  "30": "30J",
  "90": "90J",
  all: "Depuis le début",
};
