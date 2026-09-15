import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import {
  characterSheetStatusBadgeVariant,
  registrationStatusBadgeVariant,
} from "@/lib/atlas-status";
import {
  CharacterSheetStatus,
  CharacterStatus,
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
import { AtlasCharacterTabs } from "@/components/dashboard/atlas-character-tabs";
import { AtlasCreateCharacterDialog } from "@/components/dashboard/atlas-create-character-dialog";
import { AtlasPlayerGroupCard } from "@/components/dashboard/atlas-player-group-card";
import { AtlasStaffNotes } from "@/components/dashboard/atlas-staff-notes";
import {
  AtlasTimelineTabs,
  type AtlasLogActor,
  type AtlasLogItem,
} from "@/components/dashboard/atlas-timeline-tabs";

export default async function AtlasPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ sheetId?: string }>;
}) {
  const { playerId } = await params;
  const { sheetId } = await searchParams;
  const item = staffNavItems.find((i) => i.href === "/staff/atlas")!;
  const staffUser = await requireRole(item.roles);

  const [player, allGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: playerId },
      include: {
        rpGroup: {
          include: {
            members: {
              select: {
                id: true,
                discordDisplayName: true,
                minecraftUsername: true,
                discordAvatarUrl: true,
                registrationStatus: true,
                characterSheets: {
                  where: { status: CharacterStatus.ACTIVE },
                  take: 1,
                  select: {
                    name: true,
                    reviewStatus: true,
                    assignedClass: true,
                    primaryClassId: true,
                    secondaryClassId: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        characterSheets: {
          orderBy: { createdAt: "desc" },
          include: {
            primaryClass: true,
            primaryRole: true,
            secondaryClass: true,
            secondaryRole: true,
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
    }),
    prisma.rpGroup.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!player || player.registrationStatus === RegistrationStatus.REJECTED) {
    notFound();
  }

  const playerName = player.minecraftUsername ?? player.discordDisplayName;
  const activeSheet = player.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE);
  const sheet =
    (sheetId ? player.characterSheets.find((s) => s.id === sheetId) : null) ??
    activeSheet ??
    player.characterSheets[0] ??
    null;

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
  const canManageCharacters = staffUser.role === Role.ADMIN || staffUser.role === Role.RP_TRACKING;

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
    ...player.characterSheets.flatMap((charSheet) =>
      (charSheet.reviewHistory ?? []).map((entry) => {
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
          title: `Fiche (${charSheet.name || "Sans nom"}) :`,
          actor,
          badge: {
            label: characterSheetStatusLabels[entry.status],
            variant: characterSheetStatusBadgeVariant(entry.status),
          },
        };
      })
    ),
    ...player.tickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      date: ticket.createdAt,
      title: "Ticket créé :",
      link: {
        href: `/staff/tickets/${ticket.id}`,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AtlasBackButton />
        <h1 className="font-heading flex-1 text-lg font-semibold">{playerName}</h1>
        <Badge variant={registrationStatusBadgeVariant(player.registrationStatus)}>
          {registrationStatusLabels[player.registrationStatus]}
        </Badge>
        {isAdmin && canPromote && (
          <AtlasPromoteButton
            playerId={player.id}
            pseudo={playerName}
            characterSheetId={sheet?.id}
            primaryClassId={sheet?.primaryClassId ?? null}
            secondaryClassId={sheet?.secondaryClassId ?? null}
          />
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 min-[1600px]:grid-cols-[2fr_minmax(300px,1fr)]">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {player.characterSheets.length > 0 && sheet ? (
              <AtlasCharacterTabs
                playerId={player.id}
                pseudo={playerName}
                characters={player.characterSheets.map((c) => ({
                  id: c.id,
                  name: c.name,
                  status: c.status,
                  reviewStatus: c.reviewStatus,
                  createdAt: c.createdAt,
                }))}
                selectedSheetId={sheet.id}
                canManageCharacters={canManageCharacters}
              />
            ) : (
              <Card className="flex flex-col justify-between gap-4">
                <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Personnages
                </span>
                <p className="text-muted-foreground text-xs">Aucun personnage.</p>
                {canManageCharacters && (
                  <div className="flex justify-end">
                    <AtlasCreateCharacterDialog playerId={player.id} pseudo={playerName} />
                  </div>
                )}
              </Card>
            )}

            <AtlasPlayerGroupCard
              playerId={player.id}
              playerPseudo={playerName}
              group={player.rpGroup}
              declaredGroupMembers={sheet?.additionalComments ?? null}
              allGroups={allGroups.map((g) => ({
                id: g.id,
                name: g.name,
                memberCount: g._count.members,
              }))}
              canManageGroups={canManageCharacters}
            />
          </div>

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

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Statistiques
            </span>
            <div className="grid grid-cols-1 gap-4 min-[1600px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Inscription site</span>
                <p className="text-sm">
                  {formatDate(player.createdAt, { style: "prefix-short", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Inscription whitelist</span>
                <p className="text-sm">
                  {formatDate(whitelistInProgressAt, { style: "prefix-short", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Acceptation whitelist</span>
                <p className="text-sm">
                  {formatDate(whitelistedAt, { style: "prefix-short", withTime: true })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">1ère connexion serveur</span>
                <p className="text-sm">—</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Temps de jeu total</span>
                <p className="text-sm">—</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Dernière connexion</span>
                <p className="text-sm">—</p>
              </div>
            </div>
          </Card>

          <AtlasTimelineTabs logItems={logItems} />
        </div>
      </div>
    </div>
  );
}
