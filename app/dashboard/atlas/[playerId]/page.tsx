import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatPlaytime, getMockServerActivity } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";
import { registrationStatusBadgeVariant } from "@/lib/atlas-status";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { registrationStatusLabels, staffNavItems, ticketCategoryLabels } from "@/lib/navigation";
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
  type AtlasActionHistoryItem,
} from "@/components/dashboard/atlas-timeline-tabs";

function interviewBookingActionText(status: InterviewBookingStatus): string {
  switch (status) {
    case InterviewBookingStatus.ACCEPTED:
      return "Entretien accepté";
    case InterviewBookingStatus.CHANGES_REQUESTED:
      return "Modifications demandées sur l'entretien";
    case InterviewBookingStatus.REGISTERED:
      return "Entretien réservé";
  }
}

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
      characterSheet: true,
      interviewBookings: { orderBy: { createdAt: "desc" }, include: { slot: true } },
      registrationHistory: { orderBy: { createdAt: "asc" } },
      tickets: { orderBy: { createdAt: "desc" } },
      staffNotes: { orderBy: { createdAt: "desc" }, include: { author: true } },
    },
  });

  if (!player) {
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

  const actionHistory: AtlasActionHistoryItem[] = [
    ...player.registrationHistory.map((entry) => ({
      date: entry.createdAt,
      text: `Statut changé en ${registrationStatusLabels[entry.status]}`,
    })),
    ...player.tickets.map((ticket) => ({
      date: ticket.createdAt,
      text: `Ticket créé — ${ticketCategoryLabels[ticket.category]} : ${ticket.subject}`,
    })),
    ...player.interviewBookings.map((booking) => ({
      date: booking.createdAt,
      text: interviewBookingActionText(booking.status),
    })),
    ...activity.sanctions.map((sanction) => ({
      date: sanction.date,
      text: `${sanction.type} — ${sanction.text}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_minmax(300px,1fr)]">
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

          <AtlasCharacterSheetSummary sheet={sheet} pseudo={playerName} canReview={isAdmin} />

          <AtlasStaffNotes
            playerId={player.id}
            notes={player.staffNotes}
            currentUserId={staffUser.id}
          />
        </div>

        <AtlasTimelineTabs actionHistory={actionHistory} sessionBlocks={activity.sessionBlocks} />
      </div>
    </div>
  );
}
