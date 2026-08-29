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
  | "info"
  | "squares-four";

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

export interface NavGroup<T> {
  title?: string;
  items: T[];
}

export interface PlayerNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  requiredStatus: RegistrationStatus;
  hiddenFromStatus?: RegistrationStatus;
  fullWidth?: boolean;
}

export type PlayerNavGroup = NavGroup<PlayerNavItem>;

export const playerRejectedNavItem: PlayerNavItem = {
  label: "Statut d'inscription",
  href: "/player/rejection",
  iconKey: "info",
  requiredStatus: RegistrationStatus.REJECTED,
};

export const playerPendingNavGroups: PlayerNavGroup[] = [
  {
    title: "Inscription",
    items: [
      {
        label: "Premiers pas",
        href: "/player/getting-started",
        iconKey: "flag",
        requiredStatus: RegistrationStatus.NEW,
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
        label: "Tickets",
        href: "/player/tickets",
        iconKey: "ticket",
        requiredStatus: RegistrationStatus.NEW,
      },
    ],
  },
];

export const playerWhitelistedNavGroups: PlayerNavGroup[] = [
  {
    items: [
      {
        label: "Tableau de bord",
        href: "/player",
        iconKey: "squares-four",
        requiredStatus: RegistrationStatus.NEW,
        fullWidth: true,
      },
    ],
  },
  {
    title: "Roleplay",
    items: [
      {
        label: "Fiche personnage",
        href: "/player/character-sheet",
        iconKey: "id-card",
        requiredStatus: RegistrationStatus.WHITELIST_IN_PROGRESS,
      },
      {
        label: "Écriture de trame",
        href: "/player/writing",
        iconKey: "pen",
        requiredStatus: RegistrationStatus.WHITELISTED,
      },
    ],
  },
  {
    title: "Support",
    items: [
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
    ],
  },
];

export const playerNavGroups: PlayerNavGroup[] = playerPendingNavGroups;

export const playerNavItems: PlayerNavItem[] = [
  ...playerPendingNavGroups.flatMap((group) => group.items),
  ...playerWhitelistedNavGroups.flatMap((group) => group.items),
].filter((item, index, self) => index === self.findIndex((t) => t.href === item.href));

export const allStaffRoles: Role[] = [
  Role.ADMIN,
  Role.COMMUNICATION,
  Role.CONFLICT_MANAGEMENT,
  Role.RP_TRACKING,
  Role.DEVELOPER,
];

export interface StaffNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
  roles: Role[];
  fullWidth?: boolean;
}

export type StaffNavGroup = NavGroup<StaffNavItem>;

export const staffDashboardItem: StaffNavItem = {
  label: "Tableau de bord",
  href: "/staff",
  iconKey: "squares-four",
  roles: allStaffRoles,
  fullWidth: true,
};

export const staffTicketsItem: StaffNavItem = {
  label: "Tickets",
  href: "/staff/tickets",
  iconKey: "ticket",
  roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT],
};

export const staffBdaReportsItem: StaffNavItem = {
  label: "Rapports BDA",
  href: "/staff/bda-reports",
  iconKey: "shield",
  roles: [Role.ADMIN, Role.CONFLICT_MANAGEMENT],
};

export const staffAtlasItem: StaffNavItem = {
  label: "Atlas des joueurs",
  href: "/staff/atlas",
  iconKey: "users",
  roles: [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT, Role.RP_TRACKING],
  fullWidth: true,
};

export const staffWritingItem: StaffNavItem = {
  label: "Lore des joueurs",
  href: "/staff/writing",
  iconKey: "pen",
  roles: [Role.ADMIN, Role.RP_TRACKING],
};

export const staffRpTrackingItem: StaffNavItem = {
  label: "Suivi RP",
  href: "/staff/rp-tracking",
  iconKey: "chat",
  roles: [Role.ADMIN, Role.RP_TRACKING],
};

export const staffWaitlistItem: StaffNavItem = {
  label: "Liste d'attente",
  href: "/staff/waitlist",
  iconKey: "clock",
  roles: [Role.ADMIN],
};

export const staffInterviewSlotsItem: StaffNavItem = {
  label: "Créneaux d'entretien",
  href: "/staff/interview-slots",
  iconKey: "calendar",
  roles: [Role.ADMIN],
};

export const staffNavItems: StaffNavItem[] = [
  staffDashboardItem,
  staffTicketsItem,
  staffBdaReportsItem,
  staffAtlasItem,
  staffWritingItem,
  staffRpTrackingItem,
  staffWaitlistItem,
  staffInterviewSlotsItem,
];

export function getStaffNavGroups(role: Role): StaffNavGroup[] {
  const overviewGroup: StaffNavGroup = {
    items: [staffDashboardItem],
  };

  if (role === Role.ADMIN) {
    return [
      overviewGroup,
      {
        title: "Modération",
        items: [staffTicketsItem, staffBdaReportsItem],
      },
      {
        title: "Gestion RP",
        items: [staffAtlasItem, staffWritingItem, staffRpTrackingItem],
      },
      {
        title: "Admission",
        items: [staffWaitlistItem, staffInterviewSlotsItem],
      },
    ];
  }

  if (role === Role.CONFLICT_MANAGEMENT) {
    return [
      overviewGroup,
      {
        title: "Modération",
        items: [staffTicketsItem, staffBdaReportsItem, staffAtlasItem],
      },
    ];
  }

  if (role === Role.COMMUNICATION) {
    return [
      overviewGroup,
      {
        title: "Modération",
        items: [staffTicketsItem, staffAtlasItem],
      },
    ];
  }

  if (role === Role.RP_TRACKING) {
    return [
      overviewGroup,
      {
        title: "Gestion RP",
        items: [staffAtlasItem, staffWritingItem, staffRpTrackingItem],
      },
    ];
  }

  return [overviewGroup];
}

export const staffNavGroups: StaffNavGroup[] = getStaffNavGroups(Role.ADMIN);

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
  [CharacterSheetStatus.DRAFT]: "Brouillon",
  [CharacterSheetStatus.PENDING_STAFF]: "À évaluer (staff)",
  [CharacterSheetStatus.PENDING_PLAYER]: "En rédaction (joueur)",
  [CharacterSheetStatus.VALIDATED]: "Validée",
};

export const interviewBookingStatusLabels: Record<InterviewBookingStatus, string> = {
  [InterviewBookingStatus.REGISTERED]: "Inscrit",
  [InterviewBookingStatus.CHANGES_REQUESTED]: "Modifications demandées",
  [InterviewBookingStatus.ACCEPTED]: "Accepté",
};
