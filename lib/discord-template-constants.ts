export type DiscordTemplateId =
  | "TICKET_RP_CREATED"
  | "TICKET_TECH_CREATED"
  | "WAITLIST_REGISTRATION"
  | "CHARACTER_SHEET_SUBMITTED"
  | "INTERVIEW_SLOT_BOOKED";

export interface DefaultTemplateConfig {
  id: DiscordTemplateId;
  label: string;
  description: string;
  isChannelNotification?: boolean;
  channelGroup?: "tickets" | "admissions";
  channelDefaultName?: string;
}

export const DEFAULT_DISCORD_TEMPLATES: Record<DiscordTemplateId, DefaultTemplateConfig> = {
  TICKET_RP_CREATED: {
    id: "TICKET_RP_CREATED",
    label: "Tickets RP (Intrigues & Projets)",
    description:
      "Notification transmise dans le salon staff dédié lors de la création d'un ticket RP.",
    isChannelNotification: true,
    channelGroup: "tickets",
    channelDefaultName: "#tickets-rp",
  },
  TICKET_TECH_CREATED: {
    id: "TICKET_TECH_CREATED",
    label: "Tickets techniques (Bugs & Support)",
    description:
      "Notification transmise dans le salon développement dédié lors d'un signalement de bug ou problème technique.",
    isChannelNotification: true,
    channelGroup: "tickets",
    channelDefaultName: "#tickets-tech",
  },
  WAITLIST_REGISTRATION: {
    id: "WAITLIST_REGISTRATION",
    label: "Inscription en liste d'attente",
    description:
      "Notification transmise dans le salon #admissions lorsqu'un nouveau joueur valide son compte et entre sur la liste d'attente.",
    isChannelNotification: true,
    channelGroup: "admissions",
    channelDefaultName: "#admissions",
  },
  CHARACTER_SHEET_SUBMITTED: {
    id: "CHARACTER_SHEET_SUBMITTED",
    label: "Fiche RP en évaluation",
    description:
      "Notification transmise dans le salon #admissions lorsqu'un joueur soumet sa fiche de personnage pour relecture.",
    isChannelNotification: true,
    channelGroup: "admissions",
    channelDefaultName: "#admissions",
  },
  INTERVIEW_SLOT_BOOKED: {
    id: "INTERVIEW_SLOT_BOOKED",
    label: "Réservation d'un créneau d'entretien",
    description:
      "Notification transmise dans le salon #admissions lorsqu'un joueur admissible réserve son créneau d'entretien oral.",
    isChannelNotification: true,
    channelGroup: "admissions",
    channelDefaultName: "#admissions",
  },
};
