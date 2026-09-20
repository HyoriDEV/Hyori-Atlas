import {
  CharacterClass,
  CharacterSheetStatus,
  CharacterStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";

export type RpGroupStatus =
  "READY_FOR_WHITELIST" | "PENDING_REVIEW" | "IN_PROGRESS" | "ALL_WHITELISTED";

export interface RpGroupMemberSheet {
  id: string;
  name: string;
  reviewStatus: CharacterSheetStatus;
  status: CharacterStatus;
  hasUnreadFeedback: boolean;
  additionalComments: string | null;
  assignedClass: CharacterClass | null;
}

export interface RpGroupMemberBooking {
  id: string;
  status: InterviewBookingStatus;
  slot: {
    startsAt: Date;
  };
}

export interface RpGroupMemberInfo {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  minecraftUsername: string | null;
  minecraftUuid: string | null;
  role: Role;
  registrationStatus: RegistrationStatus;
  characterSheets: RpGroupMemberSheet[];
  activeSheet: RpGroupMemberSheet | null;
  interviewBookings: RpGroupMemberBooking[];
  latestBooking: RpGroupMemberBooking | null;
}

export interface RpGroupWithMembers {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  createdBy: {
    id: string;
    discordDisplayName: string;
    minecraftUsername: string | null;
  } | null;
  members: RpGroupMemberInfo[];
}

export interface RpGroupComputedStats {
  totalMembers: number;
  whitelistedCount: number;
  waitlistCount: number;
  draftingCount: number;
  pendingStaffCount: number;
  validatedCount: number;
  readyToWhitelistCount: number;
  status: RpGroupStatus;
  progressPercent: number;
}

export function computeGroupStats(members: RpGroupMemberInfo[]): RpGroupComputedStats {
  const totalMembers = members.length;

  if (totalMembers === 0) {
    return {
      totalMembers: 0,
      whitelistedCount: 0,
      waitlistCount: 0,
      draftingCount: 0,
      pendingStaffCount: 0,
      validatedCount: 0,
      readyToWhitelistCount: 0,
      status: "IN_PROGRESS",
      progressPercent: 0,
    };
  }

  let whitelistedCount = 0;
  let waitlistCount = 0;
  let draftingCount = 0;
  let pendingStaffCount = 0;
  let validatedCount = 0;
  let readyToWhitelistCount = 0;

  for (const member of members) {
    if (member.registrationStatus === RegistrationStatus.WHITELISTED) {
      whitelistedCount++;
      continue;
    }

    if (member.registrationStatus === RegistrationStatus.WAITLIST) {
      waitlistCount++;
    }

    const sheet = member.activeSheet;
    if (
      !sheet ||
      sheet.reviewStatus === CharacterSheetStatus.DRAFT ||
      sheet.reviewStatus === CharacterSheetStatus.PENDING_PLAYER
    ) {
      draftingCount++;
    } else if (sheet.reviewStatus === CharacterSheetStatus.PENDING_STAFF) {
      pendingStaffCount++;
    } else if (sheet.reviewStatus === CharacterSheetStatus.VALIDATED) {
      validatedCount++;
      readyToWhitelistCount++;
    }
  }

  let status: RpGroupStatus = "IN_PROGRESS";
  if (whitelistedCount === totalMembers) {
    status = "ALL_WHITELISTED";
  } else if (pendingStaffCount > 0) {
    status = "PENDING_REVIEW";
  } else if (readyToWhitelistCount > 0 && draftingCount === 0 && pendingStaffCount === 0) {
    status = "READY_FOR_WHITELIST";
  } else {
    status = "IN_PROGRESS";
  }

  const progressPercent = Math.round(((whitelistedCount + validatedCount) / totalMembers) * 100);

  return {
    totalMembers,
    whitelistedCount,
    waitlistCount,
    draftingCount,
    pendingStaffCount,
    validatedCount,
    readyToWhitelistCount,
    status,
    progressPercent,
  };
}

export const rpGroupStatusLabels: Record<RpGroupStatus, string> = {
  READY_FOR_WHITELIST: "Prêt pour la validation",
  PENDING_REVIEW: "Fiches à évaluer",
  IN_PROGRESS: "En cours de rédaction",
  ALL_WHITELISTED: "Tous whitelistés",
};

export const rpGroupStatusVariants: Record<
  RpGroupStatus,
  "default" | "inverted" | "outline" | "secondary" | "destructive"
> = {
  READY_FOR_WHITELIST: "default",
  PENDING_REVIEW: "inverted",
  IN_PROGRESS: "secondary",
  ALL_WHITELISTED: "outline",
};
