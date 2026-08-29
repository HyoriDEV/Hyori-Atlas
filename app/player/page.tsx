import { redirect } from "next/navigation";
import { getPlayerState } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import {
  characterSheetStatusLabels,
  interviewBookingStatusLabels,
  isRegistrationStatusAtLeast,
  registrationStatusLabels,
  staffRoleLabels,
} from "@/lib/navigation";
import { registrationStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

export default async function PlayerDashboardPage() {
  const user = await getPlayerState();

  if (user.registrationStatus !== RegistrationStatus.WHITELISTED) {
    if (user.registrationStatus === RegistrationStatus.REJECTED) {
      redirect("/player/rejection");
    }
    redirect("/player/getting-started");
  }

  const isWhitelisted = true;
  const isWaitlistPassed = true;

  const [
    activeTicketsCount,
    pendingStaffTicketsCount,
    characterSheet,
    latestBooking,
    chapterCount,
  ] = await Promise.all([
    prisma.ticket.count({
      where: {
        playerId: user.id,
        status: { not: TicketStatus.ARCHIVED },
      },
    }),
    prisma.ticket.count({
      where: {
        playerId: user.id,
        status: TicketStatus.PENDING_STAFF,
      },
    }),
    prisma.characterSheet.findUnique({
      where: { playerId: user.id },
      select: {
        id: true,
        reviewStatus: true,
        hasUnreadFeedback: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.interviewBooking.findFirst({
      where: { playerId: user.id },
      include: { slot: true },
      orderBy: { createdAt: "desc" },
    }),
    isWhitelisted
      ? prisma.chapter.count({
          where: { playerId: user.id },
        })
      : 0,
  ]);

  const isSheetValidated =
    isWhitelisted || characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED;

  const displayName =
    user.minecraftUsername ?? user.discordDisplayName ?? user.discordUsername ?? "Joueur";
  const initial = displayName.charAt(0).toUpperCase();

  const isStaff = user.role !== Role.PLAYER;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="border-border/80 from-card to-card/60 flex flex-col gap-4 rounded-xl border bg-gradient-to-r p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            {user.minecraftUuid ? (
              <SkinHead
                username={user.minecraftUsername ?? displayName}
                size="xl"
                className="ring-border shadow-xs ring-1"
              />
            ) : (
              <Avatar className="ring-border size-12 shadow-xs ring-1">
                <AvatarImage src={user.discordAvatarUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="text-base font-semibold">{initial}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex min-w-0 flex-col">
              <h1 className="font-heading text-foreground truncate text-xl font-semibold">
                Coucou, {displayName} !
              </h1>
              <p className="text-muted-foreground text-xs">
                Bienvenue sur ton espace joueur personnel.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <Badge
              variant={registrationStatusBadgeVariant(user.registrationStatus)}
              className="px-2.5 py-1 text-xs font-medium"
            >
              {registrationStatusLabels[user.registrationStatus]}
            </Badge>
            {isStaff && (
              <Badge
                variant="outline"
                className="border-primary/40 text-primary px-2.5 py-1 text-xs font-medium"
              >
                {staffRoleLabels[user.role]}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-foreground text-base font-semibold tracking-tight">
            Vue d&apos;ensemble
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {!isWhitelisted && (
            <DashboardStatCard
              title="Premiers pas"
              description="Liaison du compte Minecraft et liste d'attente."
              href="/player/getting-started"
              iconKey="flag"
              stat={user.minecraftUuid ? "Lié" : "En attente"}
              statLabel="Compte Minecraft"
            />
          )}

          <DashboardStatCard
            title="Tickets"
            description="Assistance, questions et signalements."
            href="/player/tickets"
            iconKey="ticket"
            stat={activeTicketsCount}
            statLabel={activeTicketsCount > 1 ? "actifs" : "actif"}
            badge={
              pendingStaffTicketsCount > 0
                ? {
                    label: `${pendingStaffTicketsCount} en attente staff`,
                    variant: "secondary",
                  }
                : undefined
            }
          />

          <DashboardStatCard
            title="Fiche personnage"
            description="Identité, antécédents et compétences RP."
            href="/player/character-sheet"
            iconKey="id-card"
            stat={
              characterSheet
                ? characterSheet._count.comments > 0
                  ? characterSheet._count.comments
                  : "Remplie"
                : "Non rédigée"
            }
            statLabel={
              characterSheet && characterSheet._count.comments > 0
                ? characterSheet._count.comments > 1
                  ? "retours staff"
                  : "retour staff"
                : undefined
            }
            badge={
              characterSheet
                ? {
                    label: characterSheetStatusLabels[characterSheet.reviewStatus],
                    variant:
                      characterSheet.reviewStatus === CharacterSheetStatus.VALIDATED
                        ? "default"
                        : "secondary",
                  }
                : undefined
            }
            hasNotification={characterSheet?.hasUnreadFeedback ?? false}
            locked={!isWaitlistPassed}
            lockedDescription="Accessible dès validation de ton inscription."
          />

          {!isWhitelisted && (
            <DashboardStatCard
              title="Entretien whitelist"
              description="Session vocale avec l'administration."
              href="/player/interview"
              iconKey="calendar"
              stat={
                latestBooking?.slot?.startsAt
                  ? formatDate(latestBooking.slot.startsAt)
                  : isSheetValidated
                    ? "Disponible"
                    : null
              }
              statLabel={latestBooking ? "Rendez-vous" : undefined}
              badge={
                latestBooking
                  ? {
                      label: interviewBookingStatusLabels[latestBooking.status],
                      variant:
                        latestBooking.status === InterviewBookingStatus.ACCEPTED
                          ? "default"
                          : "secondary",
                    }
                  : undefined
              }
              locked={!isWaitlistPassed || !isSheetValidated}
              lockedDescription={
                !isWaitlistPassed
                  ? "Accessible après passage de la liste d'attente."
                  : "Disponible dès validation de ta fiche."
              }
            />
          )}

          <DashboardStatCard
            title="Écriture de trame"
            description="Chapitres et récits de ton personnage."
            href="/player/writing"
            iconKey="pen"
            stat={isWhitelisted ? chapterCount : null}
            statLabel={
              isWhitelisted ? (chapterCount > 1 ? "chapitres rédigés" : "chapitre rédigé") : null
            }
            locked={!isWhitelisted}
            lockedDescription="Débloqué après validation de la whitelist."
          />

          <DashboardStatCard
            title="Suivi RP"
            description="Discussion directe avec l'équipe RP."
            href="/player/rp-tracking"
            iconKey="chat"
            stat={isWhitelisted ? "Actif" : null}
            statLabel={isWhitelisted ? "Canal ouvert" : null}
            locked={!isWhitelisted}
            lockedDescription="Débloqué après validation de la whitelist."
          />

          {isStaff && (
            <DashboardStatCard
              title="Espace Staff"
              description="Outils d'administration, atlas et modération."
              href="/staff"
              iconKey="shield-check"
              stat={staffRoleLabels[user.role]}
              statLabel="Rôle actif"
              highlight={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
