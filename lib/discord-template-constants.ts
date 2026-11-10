import { Role } from "@/lib/generated/prisma/enums";

export type TicketSummonTemplateId =
  | "TICKET_SUMMONED_RP_TRACKING"
  | "TICKET_SUMMONED_CONFLICT_MANAGEMENT"
  | "TICKET_SUMMONED_EVENT"
  | "TICKET_SUMMONED_DEVELOPER";

export type DiscordTemplateId =
  | "TICKET_RP_CREATED"
  | "TICKET_TECH_CREATED"
  | TicketSummonTemplateId
  | "TICKET_MESSAGE"
  | "RP_TRACKING_MESSAGE"
  | "REGISTRATION_ACCEPTED"
  | "REGISTRATION_WHITELISTED"
  | "REGISTRATION_REJECTED"
  | "SHEET_VALIDATED"
  | "SHEET_FEEDBACK"
  | "SHEET_REOPENED"
  | "INTERVIEW_REMINDER"
  | "WAITLIST_REGISTRATION";

export interface DefaultTemplateConfig {
  id: DiscordTemplateId;
  label: string;
  description: string;
  category: "channel" | "ticket" | "registration" | "character_sheet" | "interview" | "rp_tracking";
  isChannelNotification?: boolean;
}

export const TICKET_SUMMON_TEMPLATE_IDS: Partial<Record<Role, TicketSummonTemplateId>> = {};

export const DEFAULT_DISCORD_TEMPLATES: Record<DiscordTemplateId, DefaultTemplateConfig> = {
  TICKET_RP_CREATED: {
    id: "TICKET_RP_CREATED",
    label: "Ouverture de ticket RP (Salon Tickets RP)",
    description: "Notification transmise dans le salon staff lors de la création d'un ticket RP.",
    category: "channel",
    isChannelNotification: true,
  },
  TICKET_TECH_CREATED: {
    id: "TICKET_TECH_CREATED",
    label: "Ouverture de ticket technique (Salon Développement)",
    description:
      "Notification transmise dans le salon staff lors d'un report de bug ou problème technique.",
    category: "channel",
    isChannelNotification: true,
  },
  WAITLIST_REGISTRATION: {
    id: "WAITLIST_REGISTRATION",
    label: "Inscription en liste d'attente (Salon externe Staff)",
    description: "Notification envoyée au staff lorsqu'un joueur s'inscrit sur la liste d'attente.",
    category: "channel",
    isChannelNotification: true,
  },
  TICKET_SUMMONED_RP_TRACKING: {
    id: "TICKET_SUMMONED_RP_TRACKING",
    label: "Ticket transmis à l'équipe Suivi RP (Obsolète)",
    description: "Convocation d'équipe sur un ticket.",
    category: "ticket",
    isChannelNotification: false,
  },
  TICKET_SUMMONED_CONFLICT_MANAGEMENT: {
    id: "TICKET_SUMMONED_CONFLICT_MANAGEMENT",
    label: "Ticket transmis à l'équipe Gestion des conflits (Obsolète)",
    description: "Convocation d'équipe sur un ticket.",
    category: "ticket",
    isChannelNotification: false,
  },
  TICKET_SUMMONED_EVENT: {
    id: "TICKET_SUMMONED_EVENT",
    label: "Ticket transmis à l'équipe Événementiel (Obsolète)",
    description: "Convocation d'équipe sur un ticket.",
    category: "ticket",
    isChannelNotification: false,
  },
  TICKET_SUMMONED_DEVELOPER: {
    id: "TICKET_SUMMONED_DEVELOPER",
    label: "Ticket transmis à l'équipe Développement (Obsolète)",
    description: "Convocation d'équipe sur un ticket.",
    category: "ticket",
    isChannelNotification: false,
  },
  TICKET_MESSAGE: {
    id: "TICKET_MESSAGE",
    label: "Nouveau message de ticket (MP Joueur)",
    description:
      "Notification envoyée en message privé au joueur lorsqu'un message staff est posté dans son ticket.",
    category: "ticket",
  },
  RP_TRACKING_MESSAGE: {
    id: "RP_TRACKING_MESSAGE",
    label: "Nouveau message de suivi RP (MP Joueur)",
    description:
      "Notification envoyée en message privé au joueur lorsqu'un message staff est posté dans son suivi RP.",
    category: "rp_tracking",
  },
  REGISTRATION_ACCEPTED: {
    id: "REGISTRATION_ACCEPTED",
    label: "Inscription — Candidature acceptée (MP Joueur)",
    description: "Notification envoyée en MP au joueur quand sa candidature initiale est acceptée.",
    category: "registration",
  },
  REGISTRATION_WHITELISTED: {
    id: "REGISTRATION_WHITELISTED",
    label: "Inscription — Validation définitive (MP Joueur)",
    description:
      "Notification envoyée en MP au joueur lors de sa validation définitive sur la whitelist.",
    category: "registration",
  },
  REGISTRATION_REJECTED: {
    id: "REGISTRATION_REJECTED",
    label: "Inscription — Candidature non retenue (MP Joueur)",
    description: "Notification envoyée en MP au joueur quand sa candidature est refusée.",
    category: "registration",
  },
  SHEET_VALIDATED: {
    id: "SHEET_VALIDATED",
    label: "Fiche Personnage — Validée (MP Joueur)",
    description:
      "Notification envoyée en MP au joueur lors de la validation de sa fiche personnage.",
    category: "character_sheet",
  },
  SHEET_FEEDBACK: {
    id: "SHEET_FEEDBACK",
    label: "Fiche Personnage — Retours disponibles (MP Joueur)",
    description:
      "Notification envoyée en MP au joueur lorsque des retours staff sont déposés sur sa fiche.",
    category: "character_sheet",
  },
  SHEET_REOPENED: {
    id: "SHEET_REOPENED",
    label: "Fiche Personnage — Réouverture (MP Joueur)",
    description:
      "Notification envoyée en MP au joueur lorsque sa fiche est rouverte pour modifications.",
    category: "character_sheet",
  },
  INTERVIEW_REMINDER: {
    id: "INTERVIEW_REMINDER",
    label: "Entretien — Relance réservation (MP Joueur)",
    description: "Relance envoyée en MP au joueur pour l'inviter à choisir un créneau d'entretien.",
    category: "interview",
  },
};
