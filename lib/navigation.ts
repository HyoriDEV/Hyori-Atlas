import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

// Icons are resolved to actual components only inside the client-side
// AppShell (components/app-shell/app-shell.tsx). @phosphor-icons/react
// calls React.createContext at module scope without a "use client" guard,
// which crashes if pulled into the server/RSC module graph — so this data
// module (imported by Server Component layouts) must never import icons.
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
  | "kanban";

const registrationStatusRank: Record<RegistrationStatus, number> = {
  [RegistrationStatus.NEW]: 0,
  [RegistrationStatus.REJECTED]: 1,
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
}

export const playerNavItems: PlayerNavItem[] = [
  {
    label: "Premiers pas",
    href: "/player/getting-started",
    iconKey: "flag",
    requiredStatus: RegistrationStatus.NEW,
    hiddenFromStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
  },
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
  },
  {
    label: "Écriture de trame",
    href: "/player/writing",
    iconKey: "pen",
    requiredStatus: RegistrationStatus.WHITELISTED,
  },
  {
    label: "Suivi RP",
    href: "/player/rp-tracking",
    iconKey: "chat",
    requiredStatus: RegistrationStatus.WHITELISTED,
  },
  {
    label: "Tickets",
    href: "/player/tickets",
    iconKey: "ticket",
    requiredStatus: RegistrationStatus.NEW,
  },
];

export interface StaffNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  roles: Role[];
}

export const staffNavItems: StaffNavItem[] = [
  {
    label: "Liste d'attente",
    href: "/dashboard/waitlist",
    iconKey: "clock",
    roles: [Role.ADMIN],
  },
  {
    label: "Atlas des joueurs",
    href: "/dashboard/atlas",
    iconKey: "users",
    roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT, Role.RP_TRACKING],
  },
  {
    label: "Rapports BDA",
    href: "/dashboard/bda-reports",
    iconKey: "shield",
    roles: [Role.ADMIN, Role.CONFLICT_MANAGEMENT],
  },
  {
    label: "Backlog",
    href: "/dashboard/backlog",
    iconKey: "kanban",
    roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT, Role.DEVELOPER],
  },
  {
    label: "Créneaux d'entretien",
    href: "/dashboard/interview-slots",
    iconKey: "calendar",
    roles: [Role.ADMIN],
  },
];

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
  [RegistrationStatus.NEW]: "Nouveau",
  [RegistrationStatus.WAITLIST]: "Liste d'attente",
  [RegistrationStatus.WHITELIST_IN_PROGRESS]: "Whitelist en cours",
  [RegistrationStatus.WHITELISTED]: "Inscrit à la whitelist",
  [RegistrationStatus.REJECTED]: "Refusé",
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
  [CharacterSheetStatus.PENDING_REVIEW]: "En attente de validation",
  [CharacterSheetStatus.CHANGES_REQUESTED]: "Modifications demandées",
  [CharacterSheetStatus.VALIDATED]: "Validée",
};

export const interviewBookingStatusLabels: Record<InterviewBookingStatus, string> = {
  [InterviewBookingStatus.REGISTERED]: "Inscrit",
  [InterviewBookingStatus.CHANGES_REQUESTED]: "Modifications demandées",
  [InterviewBookingStatus.ACCEPTED]: "Accepté",
};
