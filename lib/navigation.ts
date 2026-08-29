import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

export type NavIconKey =
  | "flag"
  | "calendar"
  | "id-card"
  | "ticket"
  | "pen"
  | "chat"
  | "clock"
  | "users"
  | "shield"
  | "kanban"
  | "info";

export const registrationStatusRank: Record<RegistrationStatus, number> = {
  [RegistrationStatus.REJECTED]: -1,
  [RegistrationStatus.NEW]: 0,
  [RegistrationStatus.WAITLIST]: 1,
  [RegistrationStatus.WHITELIST_IN_PROGRESS]: 2,
  [RegistrationStatus.WHITELISTED]: 3,
};

export function isRegistrationStatusAtLeast(
  current: RegistrationStatus,
  required: RegistrationStatus
) {
  return registrationStatusRank[current] >= registrationStatusRank[required];
}

export interface PlayerNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  requiredStatus: RegistrationStatus;
  hiddenFromStatus?: RegistrationStatus;
  fullWidth?: boolean;
}

export const playerRejectedNavItem: PlayerNavItem = {
  label: "Statut d'inscription",
  href: "/player/rejection",
  iconKey: "info",
  requiredStatus: RegistrationStatus.REJECTED,
};

export const playerNavGroups: PlayerNavItem[][] = [
  [
    {
      label: "Premiers pas",
      href: "/player/getting-started",
      iconKey: "flag",
      requiredStatus: RegistrationStatus.NEW,
      hiddenFromStatus: RegistrationStatus.WHITELISTED,
    },
    {
      label: "Tickets",
      href: "/player/tickets",
      iconKey: "ticket",
      requiredStatus: RegistrationStatus.NEW,
    },
  ],
  [
    {
      label: "Fiche personnage",
      href: "/player/character-sheet",
      iconKey: "id-card",
      requiredStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
    },
    {
      label: "Entretien whitelist",
      href: "/player/interview",
      iconKey: "calendar",
      requiredStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
      hiddenFromStatus: RegistrationStatus.WHITELISTED,
    },
  ],
  [
    {
      label: "Suivi RP",
      href: "/player/rp-tracking",
      iconKey: "chat",
      requiredStatus: RegistrationStatus.WHITELISTED,
    },
    {
      label: "Écriture de trame",
      href: "/player/writing",
      iconKey: "pen",
      requiredStatus: RegistrationStatus.WHITELISTED,
    },
  ],
];

export const playerWhitelistedNavGroups: PlayerNavItem[][] = [
  [
    {
      label: "Tickets",
      href: "/player/tickets",
      iconKey: "ticket",
      requiredStatus: RegistrationStatus.NEW,
    },
  ],
  [
    {
      label: "Fiche personnage",
      href: "/player/character-sheet",
      iconKey: "id-card",
      requiredStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
    },
    {
      label: "Suivi RP",
      href: "/player/rp-tracking",
      iconKey: "chat",
      requiredStatus: RegistrationStatus.WHITELISTED,
    },
    {
      label: "Écriture de trame",
      href: "/player/writing",
      iconKey: "pen",
      requiredStatus: RegistrationStatus.WHITELISTED,
    },
  ],
];

export const playerNavItems: PlayerNavItem[] = playerNavGroups.flat();

export interface StaffNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  roles: Role[];
  fullWidth?: boolean;
}

export const staffNavGroups: StaffNavItem[][] = [
  [
    {
      label: "Backlog",
      href: "/dashboard/backlog",
      iconKey: "kanban",
      roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT, Role.DEVELOPER],
    },
    {
      label: "Tickets",
      href: "/dashboard/tickets",
      iconKey: "ticket",
      roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT],
    },
    {
      label: "Rapports BDA",
      href: "/dashboard/bda-reports",
      iconKey: "shield",
      roles: [Role.ADMIN, Role.CONFLICT_MANAGEMENT],
    },
  ],
  [
    {
      label: "Atlas des joueurs",
      href: "/dashboard/atlas",
      iconKey: "users",
      roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT, Role.RP_TRACKING],
      fullWidth: true,
    },
    {
      label: "Lore des joueurs",
      href: "/dashboard/writing",
      iconKey: "pen",
      roles: [Role.ADMIN, Role.RP_TRACKING],
    },
    {
      label: "Suivi RP",
      href: "/dashboard/rp-tracking",
      iconKey: "chat",
      roles: [Role.ADMIN, Role.RP_TRACKING],
    },
  ],
  [
    {
      label: "Liste d'attente",
      href: "/dashboard/waitlist",
      iconKey: "clock",
      roles: [Role.ADMIN],
    },
    {
      label: "Créneaux d'entretien",
      href: "/dashboard/interview-slots",
      iconKey: "calendar",
      roles: [Role.ADMIN],
    },
  ],
];

export const staffNavItems: StaffNavItem[] = staffNavGroups.flat();

export const characterSheetReviewerRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];
export const writingReviewerRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];
export const rpTrackingStaffRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];
export const ticketStaffRoles: Role[] = [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT];

export const staffRoleLabels: Record<Role, string> = {
  [Role.ADMIN]: "Administrateur",
  [Role.COMMUNICATION]: "Équipe Communication",
  [Role.CONFLICT_MANAGEMENT]: "Gestion des conflits",
  [Role.RP_TRACKING]: "Équipe Suivi RP",
  [Role.DEVELOPER]: "Développeur",
  [Role.PLAYER]: "Joueur",
};

export const roleLabels = staffRoleLabels;

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  [RegistrationStatus.NEW]: "Nouvel inscrit",
  [RegistrationStatus.WAITLIST]: "Liste d'attente",
  [RegistrationStatus.WHITELIST_IN_PROGRESS]: "En whitelist",
  [RegistrationStatus.WHITELISTED]: "Whitelisté·e",
  [RegistrationStatus.REJECTED]: "Non retenu·e",
};

export const ticketCategoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: "Question générale",
  [TicketCategory.WHITELIST]: "Whitelist",
  [TicketCategory.RP_REQUEST]: "Demande RP",
  [TicketCategory.PLAYER_COMPLAINT]: "Plainte contre un joueur",
  [TicketCategory.BUG_REPORT]: "Report de bug",
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.PENDING_STAFF]: "En attente du staff",
  [TicketStatus.PENDING_PLAYER]: "En attente du joueur",
  [TicketStatus.ARCHIVED]: "Archivé",
};

export const characterSheetStatusLabels: Record<CharacterSheetStatus, string> = {
  [CharacterSheetStatus.PENDING_STAFF]: "À évaluer (staff)",
  [CharacterSheetStatus.PENDING_PLAYER]: "En rédaction (joueur)",
  [CharacterSheetStatus.VALIDATED]: "Validée",
};

export const interviewBookingStatusLabels: Record<InterviewBookingStatus, string> = {
  [InterviewBookingStatus.REGISTERED]: "Inscrit",
  [InterviewBookingStatus.CHANGES_REQUESTED]: "Modifications demandées",
  [InterviewBookingStatus.ACCEPTED]: "Accepté",
};
