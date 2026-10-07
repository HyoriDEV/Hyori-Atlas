// Valeurs des paramètres d'URL de la liste des tickets staff, partagées entre la page (serveur)
// et ses contrôles (client).

export const TICKET_VIEWS = ["active", "staff", "player", "archived"] as const;

export type TicketView = (typeof TICKET_VIEWS)[number];

export const DEFAULT_TICKET_VIEW: TicketView = "active";

export const TICKET_READ_FILTER_UNREAD = "unread";

export const TICKET_TEAM_FILTER_NONE = "NONE";
