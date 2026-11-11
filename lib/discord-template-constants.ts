export type DiscordTemplateId =
  | "TICKET_RP_CREATED"
  | "TICKET_TECH_CREATED"
  | "WAITLIST_REGISTRATION";

export interface DefaultTemplateConfig {
  id: DiscordTemplateId;
  label: string;
  description: string;
  isChannelNotification?: boolean;
}

export const DEFAULT_DISCORD_TEMPLATES: Record<DiscordTemplateId, DefaultTemplateConfig> = {
  TICKET_RP_CREATED: {
    id: "TICKET_RP_CREATED",
    label: "Tickets RP (Intrigues & Projets)",
    description: "Notification transmise dans le salon staff lors de la création d'un ticket RP.",
    isChannelNotification: true,
  },
  TICKET_TECH_CREATED: {
    id: "TICKET_TECH_CREATED",
    label: "Tickets techniques (Bugs & Assistance)",
    description:
      "Notification transmise dans le salon développement lors d'un report de bug ou problème technique.",
    isChannelNotification: true,
  },
  WAITLIST_REGISTRATION: {
    id: "WAITLIST_REGISTRATION",
    label: "Inscription en liste d'attente",
    description: "Notification envoyée au staff lorsqu'un joueur s'inscrit sur la liste d'attente.",
    isChannelNotification: true,
  },
};
