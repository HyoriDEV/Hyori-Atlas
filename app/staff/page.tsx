import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  ConversationType,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { getStaffNavGroups, staffRoleLabels, type NavIconKey } from "@/lib/navigation";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

const staffRoles: Role[] = [
  Role.ADMIN,
  Role.COMMUNICATION,
  Role.CONFLICT_MANAGEMENT,
  Role.RP_TRACKING,
  Role.DEVELOPER,
];

const ticketRoles: Role[] = [Role.ADMIN, Role.COMMUNICATION, Role.CONFLICT_MANAGEMENT];
const atlasRoles: Role[] = [
  Role.ADMIN,
  Role.COMMUNICATION,
  Role.CONFLICT_MANAGEMENT,
  Role.RP_TRACKING,
];
const waitlistRoles: Role[] = [Role.ADMIN];
const interviewSlotRoles: Role[] = [Role.ADMIN];
const writingRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];
const rpTrackingRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];
const bdaRoles: Role[] = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export default async function StaffDashboardPage() {
  const user = await requireRole(staffRoles);

  const canAccessTickets = ticketRoles.includes(user.role);
  const canAccessAtlas = atlasRoles.includes(user.role);
  const canAccessWaitlist = waitlistRoles.includes(user.role);
  const canAccessInterviewSlots = interviewSlotRoles.includes(user.role);
  const canAccessWriting = writingRoles.includes(user.role);
  const canAccessRpTracking = rpTrackingRoles.includes(user.role);
  const canAccessBdaReports = bdaRoles.includes(user.role);
  const canAccessStaffTeam = user.role === Role.ADMIN;

  const [
    pendingTicketsCount,
    totalOpenTicketsCount,
    totalPlayersCount,
    pendingSheetsCount,
    waitlistCount,
    registeredInterviewBookingsCount,
    totalChaptersCount,
    activeRpTrackingConversationsCount,
    bdaReportsCount,
    staffMembersCount,
  ] = await Promise.all([
    canAccessTickets
      ? prisma.ticket.count({
          where: { status: TicketStatus.PENDING_STAFF },
        })
      : 0,
    canAccessTickets
      ? prisma.ticket.count({
          where: { status: { not: TicketStatus.ARCHIVED } },
        })
      : 0,
    canAccessAtlas ? prisma.user.count() : 0,
    canAccessAtlas
      ? prisma.characterSheet.count({
          where: { reviewStatus: CharacterSheetStatus.PENDING_STAFF },
        })
      : 0,
    canAccessWaitlist
      ? prisma.user.count({
          where: { registrationStatus: RegistrationStatus.WAITLIST },
        })
      : 0,
    canAccessInterviewSlots
      ? prisma.interviewBooking.count({
          where: { status: InterviewBookingStatus.REGISTERED },
        })
      : 0,
    canAccessWriting ? prisma.chapter.count() : 0,
    canAccessRpTracking
      ? prisma.conversation.count({
          where: { type: ConversationType.RP_TRACKING },
        })
      : 0,
    canAccessBdaReports
      ? prisma.ticket.count({
          where: {
            category: TicketCategory.PLAYER_COMPLAINT,
            status: { not: TicketStatus.ARCHIVED },
          },
        })
      : 0,
    canAccessStaffTeam
      ? prisma.user.count({
          where: { role: { not: Role.PLAYER } },
        })
      : 0,
  ]);

  const displayName =
    user.minecraftUsername ?? user.discordDisplayName ?? user.discordUsername ?? "Staff";
  const initial = displayName.charAt(0).toUpperCase();

  const cardConfigs: Record<
    string,
    {
      title: string;
      description: string;
      href: string;
      iconKey: NavIconKey;
      stat?: string | number | null;
      statLabel?: string | null;
      badge?: {
        label: string;
        variant?: "default" | "secondary" | "destructive" | "outline";
      };
      hasNotification?: boolean;
    }
  > = {
    "/staff/tickets": {
      title: "Tickets joueurs",
      description: "Assistance et demandes des joueurs.",
      href: "/staff/tickets",
      iconKey: "ticket",
      stat: pendingTicketsCount > 0 ? pendingTicketsCount : totalOpenTicketsCount,
      statLabel:
        pendingTicketsCount > 0
          ? "en attente staff"
          : totalOpenTicketsCount > 1
            ? "ouverts"
            : "ouvert",
      badge:
        pendingTicketsCount > 0
          ? {
              label: `${pendingTicketsCount} à traiter`,
              variant: "destructive",
            }
          : undefined,
      hasNotification: pendingTicketsCount > 0,
    },
    "/staff/bda-reports": {
      title: "Rapports GC",
      description: "Litiges et conciliation entre joueurs.",
      href: "/staff/bda-reports",
      iconKey: "shield",
      stat: bdaReportsCount,
      statLabel: bdaReportsCount > 1 ? "dossiers" : "dossier",
    },
    "/staff/staff-team": {
      title: "Équipe staff",
      description: "Gestion des permissions et rôles du staff.",
      href: "/staff/staff-team",
      iconKey: "shield-check",
      stat: staffMembersCount,
      statLabel: staffMembersCount > 1 ? "membres" : "membre",
    },
    "/staff/atlas": {
      title: "Atlas des joueurs",
      description: "Annuaire, fiches et profils des joueurs.",
      href: "/staff/atlas",
      iconKey: "users",
      stat: totalPlayersCount,
      statLabel: totalPlayersCount > 1 ? "inscrits" : "inscrit",
      badge:
        pendingSheetsCount > 0
          ? {
              label: `${pendingSheetsCount} ${
                pendingSheetsCount > 1 ? "fiches à évaluer" : "fiche à évaluer"
              }`,
              variant: "secondary",
            }
          : undefined,
    },
    "/staff/writing": {
      title: "Lore des joueurs",
      description: "Chapitres rédigés par la communauté.",
      href: "/staff/writing",
      iconKey: "pen",
      stat: totalChaptersCount,
      statLabel: totalChaptersCount > 1 ? "chapitres" : "chapitre",
    },
    "/staff/rp-tracking": {
      title: "Suivi RP",
      description: "Salons de suivi des joueurs actifs.",
      href: "/staff/rp-tracking",
      iconKey: "chat",
      stat: activeRpTrackingConversationsCount,
      statLabel: activeRpTrackingConversationsCount > 1 ? "salons actifs" : "salon actif",
    },
    "/staff/waitlist": {
      title: "Liste d'attente",
      description: "Candidatures Discord & Minecraft.",
      href: "/staff/waitlist",
      iconKey: "clock",
      stat: waitlistCount,
      statLabel: waitlistCount > 1 ? "en attente" : "en attente",
      badge:
        waitlistCount > 0 ? { label: `${waitlistCount} à valider`, variant: "default" } : undefined,
      hasNotification: waitlistCount > 0,
    },
    "/staff/interview-slots": {
      title: "Créneaux d'entretien",
      description: "Planning des entretiens vocaux.",
      href: "/staff/interview-slots",
      iconKey: "calendar",
      stat: registeredInterviewBookingsCount,
      statLabel: registeredInterviewBookingsCount > 1 ? "réservés" : "réservé",
    },
  };

  const navGroups = getStaffNavGroups(user.role)
    .filter((group) => group.title && group.items.length > 0)
    .map((group) => ({
      title: group.title!,
      items: group.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
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
                Espace staff de {displayName}
              </h1>
              <p className="text-muted-foreground text-xs">
                Accède aux modules de gestion du serveur sur cet espace.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <Badge variant="default" className="px-2.5 py-1 text-xs font-medium">
              {staffRoleLabels[user.role]}
            </Badge>
          </div>
        </div>
      </div>

      {navGroups.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-foreground text-base font-semibold tracking-tight">
              {group.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item) => {
              const config = cardConfigs[item.href];
              if (!config) return null;
              return (
                <DashboardStatCard
                  key={item.href}
                  title={config.title}
                  description={config.description}
                  href={config.href}
                  iconKey={config.iconKey}
                  stat={config.stat}
                  statLabel={config.statLabel}
                  badge={config.badge}
                  hasNotification={config.hasNotification}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-foreground text-base font-semibold tracking-tight">
            Espace personnel
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          <DashboardStatCard
            title="Espace Joueur"
            description="Ton profil personnel et tes tickets."
            href="/player"
            iconKey="user"
          />
        </div>
      </div>
    </div>
  );
}
