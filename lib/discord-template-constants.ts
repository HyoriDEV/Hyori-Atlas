export type DiscordTemplateId =
  | "TICKET_CREATED"
  | "TICKET_MESSAGE"
  | "REGISTRATION_ACCEPTED"
  | "REGISTRATION_WHITELISTED"
  | "REGISTRATION_REJECTED"
  | "SHEET_VALIDATED"
  | "SHEET_FEEDBACK"
  | "SHEET_REOPENED"
  | "INTERVIEW_REMINDER";

export interface DefaultTemplateConfig {
  id: DiscordTemplateId;
  label: string;
  category: "ticket" | "registration" | "character_sheet" | "interview";
  defaultTitle: string;
  defaultDescription: string;
  defaultButtonLabel: string;
  availableVariables: { key: string; description: string }[];
  isChannelNotification?: boolean;
}

export const DEFAULT_DISCORD_TEMPLATES: Record<DiscordTemplateId, DefaultTemplateConfig> = {
  TICKET_CREATED: {
    id: "TICKET_CREATED",
    label: "Ouverture de ticket (Salon externe Staff)",
    category: "ticket",
    isChannelNotification: true,
    defaultTitle: "Nouveau Ticket — {category}",
    defaultDescription:
      "Un nouveau ticket a été ouvert par **{author}**.\n\n**Catégorie :** {category}\n**Sujet :** {subject}\n\n> {description}\n\nConsultez et prenez en charge le ticket depuis l'espace staff.",
    defaultButtonLabel: "Consulter le ticket",
    availableVariables: [
      { key: "{author}", description: "Pseudo du joueur créateur" },
      { key: "{subject}", description: "Sujet du ticket" },
      { key: "{category}", description: "Catégorie du ticket" },
      { key: "{description}", description: "Contenu du premier message" },
      { key: "{ticketId}", description: "Identifiant du ticket" },
      { key: "{url}", description: "Lien vers le ticket sur l'espace staff" },
    ],
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
      "Félicitations, votre inscription sur **Hyori RP** a été validée !\n\nVous disposez désormais d'un accès complet au site, au serveur Discord et au serveur Minecraft.",
    defaultButtonLabel: "Accéder à mon espace joueur",
    availableVariables: [
      { key: "{playerName}", description: "Pseudo du joueur" },
      { key: "{url}", description: "Lien vers l'espace joueur" },
    ],
  },
  REGISTRATION_REJECTED: {
    id: "REGISTRATION_REJECTED",
    label: "Inscription — Candidature non retenue (MP Joueur)",
    category: "registration",
    defaultTitle: "Inscription — Candidature non retenue",
    defaultDescription:
      "Votre candidature pour rejoindre **Hyori RP** n'a pas été retenue par l'équipe staff.\n\nVous pouvez consulter les détails depuis votre espace joueur.",
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
};
