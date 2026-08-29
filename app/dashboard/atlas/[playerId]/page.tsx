import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatPlaytime, getMockServerActivity } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";
import {
  characterSheetStatusBadgeVariant,
  registrationStatusBadgeVariant,
} from "@/lib/atlas-status";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  characterSheetReviewerRoles,
  characterSheetStatusLabels,
  interviewBookingStatusLabels,
  registrationStatusLabels,
  staffNavItems,
} from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { CopyButton } from "@/components/player/copy-button";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { AtlasPromoteButton } from "@/components/dashboard/atlas-promote-button";
import { AtlasCharacterSheetSummary } from "@/components/dashboard/atlas-character-sheet-summary";
import { AtlasStaffNotes } from "@/components/dashboard/atlas-staff-notes";
import {
  AtlasTimelineTabs,
  type AtlasLogActor,
  type AtlasLogItem,
  type AtlasSanctionHistoryItem,
} from "@/components/dashboard/atlas-timeline-tabs";

export default async function AtlasPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const item = staffNavItems.find((i) => i.href === "/dashboard/atlas")!;
  const staffUser = await requireRole(item.roles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheet: {
        include: {
          reviewHistory: {
            orderBy: { createdAt: "desc" },
            include: { author: true },
          },
        },
      },
      interviewBookings: {
        orderBy: { createdAt: "desc" },
        include: { slot: true, reviewer: true },
      },
      registrationHistory: {
        orderBy: { createdAt: "asc" },
        include: { author: true },
      },
      tickets: { orderBy: { createdAt: "desc" } },
      staffNotes: { orderBy: { createdAt: "desc" }, include: { author: true } },
    },
  });

  if (!player || player.registrationStatus === RegistrationStatus.REJECTED) {
    notFound();
  }

  const playerName = player.minecraftUsername ?? player.discordDisplayName;
  const sheet = player.characterSheet;
  const activity = getMockServerActivity(player.id, player.createdAt);

  const whitelistInProgressAt = player.registrationHistory.find(
    (entry) => entry.status === RegistrationStatus.WHITELIST_IN_PROGRESS
  )?.createdAt;
  const whitelistedAt = player.registrationHistory.find(
    (entry) => entry.status === RegistrationStatus.WHITELISTED
  )?.createdAt;

  const canPromote =
    sheet?.reviewStatus === CharacterSheetStatus.VALIDATED &&
    player.registrationStatus !== RegistrationStatus.WHITELISTED;
  const isAdmin = staffUser.role === Role.ADMIN;
  const canReviewSheet = characterSheetReviewerRoles.includes(staffUser.role);

  const logItems: AtlasLogItem[] = [
    ...player.registrationHistory.map((entry) => {
      let actor: AtlasLogActor;
      if (entry.authorId === player.id) {
        actor = { type: "player" };
      } else if (entry.author) {
        actor = {
          type: "staff",
          name: entry.author.minecraftUsername ?? entry.author.discordDisplayName,
        };
      } else {
        actor = { type: "system" };
      }

      return {
        id: `status-${entry.id}`,
        date: entry.createdAt,
        title: `Statut d'inscription :`,
        actor,
        badge: {
          label: registrationStatusLabels[entry.status],
          variant: registrationStatusBadgeVariant(entry.status),
        },
      };
    }),
    ...(player.characterSheet?.reviewHistory ?? []).map((entry) => {
      let actor: AtlasLogActor;
      if (entry.authorId === player.id) {
        actor = { type: "player" };
      } else if (entry.author) {
        actor = {
          type: "staff",
          name: entry.author.minecraftUsername ?? entry.author.discordDisplayName,
        };
      } else {
        actor = { type: "system" };
      }

      return {
        id: `sheet-review-${entry.id}`,
        date: entry.createdAt,
        title: "Fiche personnage :",
        actor,
        badge: {
          label: characterSheetStatusLabels[entry.status],
          variant: characterSheetStatusBadgeVariant(entry.status),
        },
      };
    }),
    ...player.tickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      date: ticket.createdAt,
      title: "Ticket créé :",
      link: {
        href: `/dashboard/tickets/${ticket.id}`,
        label: ticket.subject,
        targetBlank: true,
      },
    })),
    ...player.interviewBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      date: booking.createdAt,
      title: "Entretien oral réservé",
      metadata: `Créneau : ${formatDate(booking.slot.startsAt, { style: "prefix-long", withTime: true })}`,
    })),
    ...player.interviewBookings
      .filter((booking) => booking.status !== InterviewBookingStatus.REGISTERED)
      .map((booking) => ({
        id: `booking-review-${booking.id}`,
        date: booking.updatedAt,
        title:
          booking.status === InterviewBookingStatus.ACCEPTED
            ? "Entretien oral validé"
            : "Modifications demandées sur l'entretien",
        actor: booking.reviewer
          ? {
              type: "staff" as const,
              name: booking.reviewer.minecraftUsername ?? booking.reviewer.discordDisplayName,
            }
          : { type: "staff" as const, name: "Staff" },
        badge: {
          label: interviewBookingStatusLabels[booking.status],
          variant:
            booking.status === InterviewBookingStatus.ACCEPTED
              ? ("default" as const)
              : ("outline" as const),
        },
        metadata: `Créneau : ${formatDate(booking.slot.startsAt, { style: "prefix-long", withTime: true })}`,
      })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const sanctionHistory: AtlasSanctionHistoryItem[] = activity.sanctions
    .map((sanction) => ({
      date: sanction.date,
      title: sanction.title,
      reason: sanction.reason,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AtlasBackButton />
        <h1 className="font-heading flex-1 text-lg font-semibold">{playerName}</h1>
        <Badge variant={registrationStatusBadgeVariant(player.registrationStatus)}>
          {registrationStatusLabels[player.registrationStatus]}
        </Badge>
        {isAdmin && canPromote && <AtlasPromoteButton playerId={player.id} pseudo={playerName} />}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_minmax(300px,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="flex flex-row items-center gap-3.5">
              <SkinHead size="2xl" username={player.minecraftUsername ?? undefined} />
              <div className="flex flex-col justify-center gap-1">
                <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Minecraft
                </span>
                <div className="flex flex-col justify-center">
                  <span className="text-sm font-medium">{player.minecraftUsername ?? "—"}</span>
                  <div className="text-muted-foreground flex items-center text-xs">
                    <span>UUID: {player.minecraftUuid ?? "—"}</span>
                    {player.minecraftUuid && <CopyButton value={player.minecraftUuid} />}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex-row items-center gap-3.5">
              <Avatar size="2xl">
                <AvatarImage
                  src={player.discordAvatarUrl ?? undefined}
                  alt={player.discordDisplayName}
                />
                <AvatarFallback>{player.discordDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col justify-center gap-1">
                <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Discord
                </span>
                <div className="flex flex-col justify-center">
                  <span className="text-sm font-medium">
                    {player.discordDisplayName} ({player.discordUsername})
                  </span>
                  <div className="text-muted-foreground flex items-center text-xs">
                    <span>ID: {player.discordId}</span>
                    {player.discordId && <CopyButton value={player.discordId} />}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="flex flex-col gap-4">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Statistiques
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Inscription site</span>
                <p className="text-sm">
                  {formatDate(player.createdAt, { style: "prefix-long", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Inscription whitelist</span>
                <p className="text-sm">
                  {formatDate(whitelistInProgressAt, { style: "prefix-long", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Acceptation whitelist</span>
                <p className="text-sm">
                  {formatDate(whitelistedAt, { style: "prefix-long", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">1ère connexion serveur</span>
                <p className="text-sm">
                  {formatDate(activity.firstServerLoginAt, {
                    style: "prefix-long",
                    withTime: true,
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Temps de jeu total</span>
                <p className="text-sm">
                  {activity.lastLoginAt ? formatPlaytime(activity.totalPlaytimeMinutes) : "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Dernière connexion</span>
                <p className="text-sm">
                  {formatDate(activity.lastLoginAt, { style: "prefix-long", withTime: true })}
                </p>
              </div>
            </div>
          </Card>

          <AtlasCharacterSheetSummary
            sheet={sheet}
            playerId={player.id}
            pseudo={playerName}
            canReview={canReviewSheet}
          />

          <AtlasStaffNotes
            playerId={player.id}
            notes={player.staffNotes}
            currentUserId={staffUser.id}
          />
        </div>

        <AtlasTimelineTabs
          logItems={logItems}
          sanctionHistory={sanctionHistory}
          sessionBlocks={activity.sessionBlocks}
        />
      </div>
    </div>
  );
}
