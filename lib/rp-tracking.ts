// États d'un suivi RP, partagés entre le service (serveur) et les contrôles de la liste (client).

/** Au-delà de ce nombre de jours sans échange, un suivi à jour est considéré en sommeil. */
export const RP_TRACKING_ACTIVE_DAYS = 30;

export const RP_TRACKING_STATES = ["pending", "recent", "dormant", "none"] as const;

export type RpTrackingState = (typeof RP_TRACKING_STATES)[number];

export const rpTrackingStateLabels: Record<RpTrackingState, string> = {
  pending: "À traiter",
  recent: "Actif",
  dormant: "En sommeil",
  none: "Sans échange",
};

export const RP_TRACKING_VIEWS = ["all", ...RP_TRACKING_STATES] as const;

export type RpTrackingView = (typeof RP_TRACKING_VIEWS)[number];

export const DEFAULT_RP_TRACKING_VIEW: RpTrackingView = "all";
