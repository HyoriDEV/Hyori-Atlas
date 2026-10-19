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

// Rétrocompatibilité pour éventuels imports existants
export const RP_TRACKING_VIEWS = ["all", ...RP_TRACKING_STATES] as const;
export type RpTrackingView = (typeof RP_TRACKING_VIEWS)[number];
export const DEFAULT_RP_TRACKING_VIEW: RpTrackingView = "all";
