import { Role } from "@/lib/generated/prisma/enums";

export type TicketSummonTemplateId =
  | "TICKET_SUMMONED_RP_TRACKING"
  | "TICKET_SUMMONED_CONFLICT_MANAGEMENT"
  | "TICKET_SUMMONED_EVENT"
  | "TICKET_SUMMONED_DEVELOPER";

export type DiscordTemplateId =
  | "TICKET_CREATED"
  | "TICKET_SECRET_CREATED"
  | "TICKET_RP_CREATED"
  | "TICKET_RP_SPOILER_CREATED"
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
  category: "ticket" | "registration" | "character_sheet" | "interview" | "rp_tracking";
  defaultTitle: string;
  defaultDescription: string;
  defaultButtonLabel: string;
  availableVariables: { key: string; description: string }[];
  isChannelNotification?: boolean;
}

const TICKET_VARIABLES = [
  { key: "{author}", description: "Pseudo du joueur créateur" },
  { key: "{subject}", description: "Sujet du ticket" },
  { key: "{description}", description: "Contenu du premier message" },
  { key: "{ticketId}", description: "Identifiant du ticket" },
  { key: "{url}", description: "Lien vers le ticket sur l'espace staff" },
];

export const TICKET_OPENING_TEMPLATE: Omit<DefaultTemplateConfig, "id" | "label"> = {
  category: "ticket",
  isChannelNotification: true,
  defaultTitle: "🎫 Nouveau Ticket Ouvert",
  defaultDescription:
    "Un nouveau ticket ouvert a été créé par **{author}**.\n\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
  defaultButtonLabel: "Consulter le ticket",
  availableVariables: TICKET_VARIABLES,
};

export const TICKET_SECRET_TEMPLATE: Omit<DefaultTemplateConfig, "id" | "label"> = {
  category: "ticket",
  isChannelNotification: true,
  defaultTitle: "🔒 Nouveau Ticket Secret",
  defaultDescription:
    "Un nouveau ticket secret a été créé par **{author}**.\n\n⚠️ **Ce ticket contient des spoils ou des informations confidentielles (capture, RPK...).**\n\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
  defaultButtonLabel: "Consulter le ticket secret",
  availableVariables: TICKET_VARIABLES,
};

export const TICKET_RP_TEMPLATE: Omit<DefaultTemplateConfig, "id" | "label"> = {
  category: "ticket",
  isChannelNotification: true,
  defaultTitle: "🎫 Nouveau Ticket RP",
  defaultDescription:
    "Un nouveau ticket RP a été créé par **{author}**.\n\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
  defaultButtonLabel: "Consulter le ticket",
  availableVariables: TICKET_VARIABLES,
};

export const TICKET_RP_SPOILER_TEMPLATE: Omit<DefaultTemplateConfig, "id" | "label"> = {
  category: "ticket",
  isChannelNotification: true,
  defaultTitle: "🔒 Nouveau Ticket RP (Spoiler)",
  defaultDescription:
    "Un nouveau ticket RP confidentiel a été créé par **{author}**.\n\n⚠️ **Ce ticket contient des spoils ou des informations sensibles (projets, captures, mort de personnage...).**\n\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
  defaultButtonLabel: "Consulter le ticket confidentiel",
  availableVariables: TICKET_VARIABLES,
};

export const TICKET_TECH_TEMPLATE: Omit<DefaultTemplateConfig, "id" | "label"> = {
  category: "ticket",
  isChannelNotification: true,
  defaultTitle: "🛠️ Nouveau Ticket Technique",
  defaultDescription:
    "Un nouveau ticket technique a été créé par **{author}**.\n\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
  defaultButtonLabel: "Consulter le ticket technique",
  availableVariables: TICKET_VARIABLES,
};

export const TICKET_SUMMON_TEMPLATE_IDS: Partial<Record<Role, TicketSummonTemplateId>> = {};

export const DEFAULT_DISCORD_TEMPLATES: Record<DiscordTemplateId, DefaultTemplateConfig> = {
  TICKET_CREATED: {
    ...TICKET_OPENING_TEMPLATE,
    id: "TICKET_CREATED",
    label: "Ouverture de ticket ouvert (Salon tickets Staff)",
  },
  TICKET_SECRET_CREATED: {
    ...TICKET_SECRET_TEMPLATE,
    id: "TICKET_SECRET_CREATED",
    label: "Ouverture de ticket secret (Salon confidentiel Staff)",
  },
  TICKET_RP_CREATED: {
    ...TICKET_RP_TEMPLATE,
    id: "TICKET_RP_CREATED",
    label: "Ouverture de ticket Roleplay (Salon Tickets RP)",
  },
  TICKET_RP_SPOILER_CREATED: {
    ...TICKET_RP_SPOILER_TEMPLATE,
    id: "TICKET_RP_SPOILER_CREATED",
    label: "Ouverture de ticket RP Spoiler (Salon Confidentiel RP)",
  },
  TICKET_TECH_CREATED: {
    ...TICKET_TECH_TEMPLATE,
    id: "TICKET_TECH_CREATED",
    label: "Ouverture de ticket Technique (Salon Développement)",
  },
  TICKET_SUMMONED_RP_TRACKING: {
    ...TICKET_OPENING_TEMPLATE,
    isChannelNotification: false,
    id: "TICKET_SUMMONED_RP_TRACKING",
    label: "Ticket transmis à l'équipe Suivi RP (Obsolète)",
  },
  TICKET_SUMMONED_CONFLICT_MANAGEMENT: {
    ...TICKET_OPENING_TEMPLATE,
    isChannelNotification: false,
    id: "TICKET_SUMMONED_CONFLICT_MANAGEMENT",
    label: "Ticket transmis à l'équipe Gestion des conflits (Obsolète)",
  },
  TICKET_SUMMONED_EVENT: {
    ...TICKET_OPENING_TEMPLATE,
    isChannelNotification: false,
    id: "TICKET_SUMMONED_EVENT",
    label: "Ticket transmis à l'équipe Événementiel (Obsolète)",
  },
  TICKET_SUMMONED_DEVELOPER: {
    ...TICKET_OPENING_TEMPLATE,
    isChannelNotification: false,
    id: "TICKET_SUMMONED_DEVELOPER",
    label: "Ticket transmis à l'équipe Développement (Obsolète)",
  },
  TICKET_MESSAGE: {
    id: "TICKET_MESSAGE",
    label: "Nouveau message de ticket (MP Joueur)",
    category: "ticket",
    defaultTitle: "Ticket — Nouveau message",
    defaultDescription:
      "Un nouveau message a été posté par **{author}** dans votre ticket **« {subject} »**.\n\n> {preview}\n\nRendez-vous sur votre espace joueur pour consulter l'échange et y répondre.",
    defaultButtonLabel: "Consulter le ticket",
    availableVariables: [
      { key: "{author}", description: "Auteur du message (Staff ou Joueur)" },
      { key: "{subject}", description: "Sujet du ticket" },
      { key: "{preview}", description: "Aperçu textuel du message" },
      { key: "{url}", description: "Lien direct vers le ticket du joueur" },
    ],
  },
  RP_TRACKING_MESSAGE: {
    id: "RP_TRACKING_MESSAGE",
    label: "Nouveau message de suivi RP (MP Joueur)",
    category: "rp_tracking",
    defaultTitle: "Suivi RP — Nouveau message de l'équipe",
    defaultDescription:
      "Un nouveau message a été posté par **{author}** dans votre suivi RP.\n\n> {preview}\n\nRendez-vous sur votre espace joueur pour consulter l'échange et y répondre.",
    defaultButtonLabel: "Consulter mon suivi RP",
    availableVariables: [
      { key: "{author}", description: "Auteur du message (L'équipe staff)" },
      { key: "{preview}", description: "Aperçu textuel du message" },
      { key: "{characterName}", description: "Nom du personnage RP" },
      { key: "{url}", description: "Lien direct vers le suivi RP du joueur" },
    ],
  },
  REGISTRATION_ACCEPTED: {
    id: "REGISTRATION_ACCEPTED",
    label: "Inscription — Candidature acceptée (MP Joueur)",
    category: "registration",
    defaultTitle: "Inscription — Candidature acceptée",
    defaultDescription:
      "Votre candidature pour rejoindre **Hyori RP** a été acceptée par l'équipe staff.\n\nVous pouvez dès à présent accéder à votre espace joueur pour préparer votre fiche personnage et réserver votre entretien vocal.",
    defaultButtonLabel: "Accéder à mon espace joueur",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers l'espace joueur" },
    ],
  },
  REGISTRATION_WHITELISTED: {
    id: "REGISTRATION_WHITELISTED",
    label: "Inscription — Validation définitive (MP Joueur)",
    category: "registration",
    defaultTitle: "Whitelist — Validation définitive",
    defaultDescription:
      "Félicitations, votre inscription sur **Hyori RP** a été validée !\n\nVous disposez désormais d'un accès complet au site, au serveur Discord communautaire et au serveur Minecraft.\n\n🏛️ **Serveur Discord de votre classe ({villageName}) :**\n{villageInviteUrl}",
    defaultButtonLabel: "Accéder à mon espace joueur",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers l'espace joueur" },
      { key: "{className}", description: "Classe RP attribuée (ex: Noble, Pêcheur...)" },
      { key: "{villageName}", description: "Nom du village / serveur Discord attribué" },
      {
        key: "{villageInviteUrl}",
        description: "Lien d'invitation permanent vers le Discord du village",
      },
    ],
  },
  REGISTRATION_REJECTED: {
    id: "REGISTRATION_REJECTED",
    label: "Inscription — Candidature non retenue (MP Joueur)",
    category: "registration",
    defaultTitle: "Inscription — Candidature non retenue",
    defaultDescription:
      "Ta candidature pour rejoindre **Hyori RP** n'a pas été retenue par l'équipe staff.\n\nTu peux consulter les détails depuis ton espace joueur.",
    defaultButtonLabel: "Accéder à mon espace joueur",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers l'espace joueur" },
    ],
  },
  SHEET_VALIDATED: {
    id: "SHEET_VALIDATED",
    label: "Fiche Personnage — Validée (MP Joueur)",
    category: "character_sheet",
    defaultTitle: "Fiche Personnage — Validée",
    defaultDescription:
      "Félicitations, votre fiche personnage a été validée par l'équipe staff !\n\nVous pouvez dès à présent la consulter dans votre espace joueur et poursuivre les étapes de votre inscription.",
    defaultButtonLabel: "Consulter ma fiche personnage",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers la fiche personnage" },
    ],
  },
  SHEET_FEEDBACK: {
    id: "SHEET_FEEDBACK",
    label: "Fiche Personnage — Retours disponibles (MP Joueur)",
    category: "character_sheet",
    defaultTitle: "Fiche Personnage — Retours disponibles",
    defaultDescription:
      "Des retours ont été déposés sur votre fiche personnage par l'équipe staff.\n\nConsultez les remarques directement sur votre fiche pour apporter les ajustements demandés.",
    defaultButtonLabel: "Consulter ma fiche personnage",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers la fiche personnage" },
    ],
  },
  SHEET_REOPENED: {
    id: "SHEET_REOPENED",
    label: "Fiche Personnage — Réouverture (MP Joueur)",
    category: "character_sheet",
    defaultTitle: "Fiche Personnage — Réouverture",
    defaultDescription:
      "Votre fiche personnage a été rouverte par l'équipe staff.\n\nVous pouvez dès à présent la modifier et la soumettre à nouveau depuis votre espace joueur.",
    defaultButtonLabel: "Consulter ma fiche personnage",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers la fiche personnage" },
    ],
  },
  INTERVIEW_REMINDER: {
    id: "INTERVIEW_REMINDER",
    label: "Entretien — Relance réservation (MP Joueur)",
    category: "interview",
    defaultTitle: "Entretien Whitelist — Réserve ton créneau",
    defaultDescription:
      "Bonne nouvelle ! Ta fiche personnage a été validée par l'équipe staff et tu es désormais invité·e à passer ton entretien vocal de whitelist.\n\nDes créneaux sont actuellement ouverts. Rends-toi sur ton espace joueur pour choisir et réserver le créneau qui te convient le mieux !",
    defaultButtonLabel: "Réserver un créneau",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers la réservation d'entretien" },
    ],
  },
  WAITLIST_REGISTRATION: {
    id: "WAITLIST_REGISTRATION",
    label: "Inscription en liste d'attente (Salon externe Staff)",
    category: "registration",
    isChannelNotification: true,
    defaultTitle: "Nouvelle Inscription — Liste d'attente",
    defaultDescription:
      "Nouveau inscrit sur la liste d'attente..\n\n**Joueur :** {playerName}\n**Minecraft :** {minecraftUsername}\n\nConsulte la liste d'attente depuis l'espace staff.",
    defaultButtonLabel: "Consulter la liste d'attente",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo Discord ou nom d'affichage du joueur" },
      { key: "{minecraftUsername}", description: "Pseudo Minecraft lié du joueur" },
      { key: "{discordId}", description: "Identifiant Discord du joueur" },
      { key: "{url}", description: "Lien vers la liste d'attente sur l'espace staff" },
    ],
  },
};
