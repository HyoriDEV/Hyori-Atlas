// États d'un suivi RP, partagés entre le service (serveur) et les contrôles de la liste (client).

/** Au-delà de ce nombre de jours sans échange, un suivi à jour est considéré en sommeil. */
export const RP_TRACKING_ACTIVE_DAYS = 30;

export const RP_TRACKING_STATES = ["pending", "recent", "dormant", "none"] as const;

export type RpTrackingState = (typeof RP_TRACKING_STATES)[number];

export const rpTrackingStateLabels: Record<RpTrackingState, string> = {
  pending: "À traiter",
  recent: "Actif",
  dormant: "En sommeil",
  none: "Non démarré",
};

/** Options de filtrage de statut dans la liste des suivis RP */
export const RP_TRACKING_FILTER_STATUSES = [
  "ongoing",
  "pending",
  "recent",
  "dormant",
  "none",
  "all",
] as const;

export type RpTrackingFilterStatus = (typeof RP_TRACKING_FILTER_STATUSES)[number];

export const rpTrackingFilterStatusLabels: Record<RpTrackingFilterStatus, string> = {
  ongoing: "En cours (À traiter & Actifs)",
  pending: "À traiter uniquement",
  recent: "Actifs uniquement",
  dormant: "En sommeil",
  none: "Non démarrés",
  all: "Tous les statuts",
};

export const DEFAULT_RP_TRACKING_FILTER_STATUS: RpTrackingFilterStatus = "ongoing";

/** Options de filtrage par présence de trame */
export const RP_TRACKING_WRITING_FILTERS = ["all", "has_writing", "no_writing"] as const;

export type RpTrackingWritingFilter = (typeof RP_TRACKING_WRITING_FILTERS)[number];

export const rpTrackingWritingFilterLabels: Record<RpTrackingWritingFilter, string> = {
  all: "Toutes les trames",
  has_writing: "Avec trame rédigée",
  no_writing: "Sans trame",
};

export const DEFAULT_RP_TRACKING_WRITING_FILTER: RpTrackingWritingFilter = "all";

/** Options de filtrage par date de dernière modification de la trame */
export const RP_TRACKING_WRITING_EDITED_FILTERS = [
  "all",
  "day",
  "week",
  "month",
  "stale",
  "never",
] as const;

export type RpTrackingWritingEditedFilter = (typeof RP_TRACKING_WRITING_EDITED_FILTERS)[number];

export const rpTrackingWritingEditedFilterLabels: Record<RpTrackingWritingEditedFilter, string> = {
  all: "Trame modifiée : toutes dates",
  day: "Modifiée depuis moins de 24 h",
  week: "Modifiée depuis moins de 7 jours",
  month: "Modifiée depuis moins de 30 jours",
  stale: "Non modifiée depuis 30 jours +",
  never: "Aucune trame",
};

export const DEFAULT_RP_TRACKING_WRITING_EDITED_FILTER: RpTrackingWritingEditedFilter = "all";

/** Tri de la liste : par défaut (statut) ou par date de dernière modification de la trame */
export const RP_TRACKING_SORTS = ["default", "writing_recent", "writing_oldest"] as const;

export type RpTrackingSort = (typeof RP_TRACKING_SORTS)[number];

export const rpTrackingSortLabels: Record<RpTrackingSort, string> = {
  default: "Tri : par statut",
  writing_recent: "Tri : trame modifiée récemment",
  writing_oldest: "Tri : trame modifiée il y a longtemps",
};

export const DEFAULT_RP_TRACKING_SORT: RpTrackingSort = "default";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fenêtre (en ms) des filtres « modifiée depuis moins de … ». */
export const RP_TRACKING_WRITING_EDITED_WINDOWS_MS: Partial<
  Record<RpTrackingWritingEditedFilter, number>
> = {
  day: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
  stale: 30 * DAY_MS,
};

// Rétrocompatibilité pour éventuels imports existants
export const RP_TRACKING_VIEWS = ["all", ...RP_TRACKING_STATES] as const;
export type RpTrackingView = (typeof RP_TRACKING_VIEWS)[number];
export const DEFAULT_RP_TRACKING_VIEW: RpTrackingView = "all";
