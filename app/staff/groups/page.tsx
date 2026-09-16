import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterStatus, RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import type { PlayerOption } from "@/components/player-select";
import type { RpGroupWithMembers } from "@/lib/rp-groups";
import { RpGroupsDashboard } from "@/components/staff/groups/rp-groups-dashboard";

export const metadata: Metadata = {
  title: "Groupes RP",
};

export default async function StaffGroupsPage() {
  const staffUser = await requireRole([Role.ADMIN, Role.RP_TRACKING]);

  const [rawGroups, rawUsers] = await Promise.all([
    prisma.rpGroup.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            discordDisplayName: true,
            minecraftUsername: true,
          },
        },
        members: {
          include: {
            characterSheets: {
              orderBy: { createdAt: "desc" },
            },
            interviewBookings: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { slot: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        registrationStatus: { not: RegistrationStatus.REJECTED },
      },
      include: {
        characterSheets: {
          where: { status: CharacterStatus.ACTIVE },
          take: 1,
        },
      },
      orderBy: { discordDisplayName: "asc" },
    }),
  ]);

  const availablePlayers: PlayerOption[] = rawUsers.map((u) => ({
    id: u.id,
    discordDisplayName: u.discordDisplayName,
    discordUsername: u.discordUsername,
    discordAvatarUrl: u.discordAvatarUrl,
    minecraftUsername: u.minecraftUsername,
    role: u.role,
    registrationStatus: u.registrationStatus,
    characterName: u.characterSheets[0]?.name ?? null,
  }));

  const groups: RpGroupWithMembers[] = rawGroups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    createdById: g.createdById,
    createdBy: g.createdBy,
    members: g.members.map((m) => {
      const activeSheet =
        m.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE) ??
        m.characterSheets[0] ??
        null;
      const latestBooking = m.interviewBookings[0] ?? null;

      return {
        id: m.id,
        discordId: m.discordId,
        discordUsername: m.discordUsername,
        discordDisplayName: m.discordDisplayName,
        discordAvatarUrl: m.discordAvatarUrl,
        minecraftUsername: m.minecraftUsername,
        minecraftUuid: m.minecraftUuid,
        role: m.role,
        registrationStatus: m.registrationStatus,
        characterSheets: m.characterSheets.map((s) => ({
          id: s.id,
          name: s.name,
          reviewStatus: s.reviewStatus,
          status: s.status,
          hasUnreadFeedback: s.hasUnreadFeedback,
          additionalComments: s.additionalComments,
          assignedClass: s.assignedClass,
        })),
        activeSheet: activeSheet
          ? {
              id: activeSheet.id,
              name: activeSheet.name,
              reviewStatus: activeSheet.reviewStatus,
              status: activeSheet.status,
              hasUnreadFeedback: activeSheet.hasUnreadFeedback,
              additionalComments: activeSheet.additionalComments,
              assignedClass: activeSheet.assignedClass,
            }
          : null,
        interviewBookings: m.interviewBookings.map((b) => ({
          id: b.id,
          status: b.status,
          slot: { startsAt: b.slot.startsAt },
        })),
        latestBooking: latestBooking
          ? {
              id: latestBooking.id,
              status: latestBooking.status,
              slot: { startsAt: latestBooking.slot.startsAt },
            }
          : null,
      };
    }),
  }));

  const canManageGroups = staffUser.role === Role.ADMIN || staffUser.role === Role.RP_TRACKING;

  return (
    <RpGroupsDashboard
      groups={groups}
      availablePlayers={availablePlayers}
      canManageGroups={canManageGroups}
    />
  );
}
