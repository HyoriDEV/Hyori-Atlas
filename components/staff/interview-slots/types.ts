import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";

export interface InterviewSlotPlayer {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  minecraftUuid: string | null;
  minecraftUsername: string | null;
  registrationStatus: RegistrationStatus;
  characterSheet: {
    id: string;
    reviewStatus: CharacterSheetStatus;
    name: string;
  } | null;
}

export interface InterviewSlotBooking {
  id: string;
  status: InterviewBookingStatus;
  createdAt: Date;
  updatedAt: Date;
  playerId: string;
  player: InterviewSlotPlayer;
  reviewedById: string | null;
}

export interface InterviewSlotItem {
  id: string;
  startsAt: Date;
  createdAt: Date;
  booking: InterviewSlotBooking | null;
}

export interface InterviewSlotsKPIs {
  totalUpcoming: number;
  totalToday: number;
  totalBooked: number;
  totalAvailable: number;
  totalPast: number;
  nextInterviewDate: Date | null;
}
