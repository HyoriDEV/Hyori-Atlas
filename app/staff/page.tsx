import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tableau de bord Staff",
};
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  SanctionType,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import {
  allStaffRoles,
  getStaffNavGroups,
  rpManagementRoles,
  rpTrackingStaffRoles,
  staffAtlasItem,
  staffRoleLabels,
  type NavIconKey,
} from "@/lib/navigation";
import { getUnreadTickets, ticketAccessWhere } from "@/lib/ticket-access";
import { getRpTrackingStates } from "@/lib/services/rp-tracking-service";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

const staffRoles = allStaffRoles;
const atlasRoles = staffAtlasItem.roles;
const waitlistRoles: Role[] = [Role.ADMIN];
const interviewSlotRoles: Role[] = [Role.ADMIN];
const distributionRoles = rpManagementRoles;
const rpTrackingRoles = rpTrackingStaffRoles;
const bdaRoles: Role[] = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export default async function StaffDashboardPage() {
  const user = await requireRole(staffRoles);

  const canAccessAtlas = atlasRoles.includes(user.role);
  const canAccessWaitlist = waitlistRoles.includes(user.role);
  const canAccessInterviewSlots = interviewSlotRoles.includes(user.role);
  const canAccessDistribution = distributionRoles.includes(user.role);
  const canAccessRpTracking = rpTrackingRoles.includes(user.role);
  const canAccessBdaReports = bdaRoles.includes(user.role);
  const canAccessStaffTeam = user.role === Role.ADMIN;
  const canAccessSanctions = user.role === Role.ADMIN;

  const ticketWhereBase = ticketAccessWhere(user);

  const [
    pendingTicketsCount,
    totalOpenTicketsCount,
    unreadTickets,
    totalPlayersCount,
    pendingSheetsCount,
    waitlistCount,
    registeredInterviewBookingsCount,
    totalPlayerClassesCount,
    rpTrackingCounts,
    bdaReportsCount,
    staffMembersCount,
    activeSanctionsCount,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { AND: [ticketWhereBase, { status: TicketStatus.PENDING_STAFF }] },
    }),
    prisma.ticket.count({
      where: { AND: [ticketWhereBase, { status: { not: TicketStatus.ARCHIVED } }] },
    }),
    getUnreadTickets(user),
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
          where: {
            status: InterviewBookingStatus.REGISTERED,
            slot: { startsAt: { gte: new Date() } },
          },
        })
      : 0,
    canAccessDistribution ? prisma.playerClass.count() : 0,
    canAccessRpTracking ? getRpTrackingStates().then((states) => states.counts) : null,
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
    canAccessSanctions
      ? prisma.sanction.count({
          where: {
            revokedAt: null,
            OR: [
              { type: { in: [SanctionType.WARNING, SanctionType.EXCLUSION] } },
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        })
      : 0,
  ]);

  const pendingRpTrackingCount = rpTrackingCounts?.pending ?? 0;
  const ongoingRpTrackingCount = pendingRpTrackingCount + (rpTrackingCounts?.recent ?? 0);

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
    "/staff/statistics": {
      title: "Statistiques",
      description: "Admission, activité en jeu, personnages et support.",
      href: "/staff/statistics",
      iconKey: "chart",
    },
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
      hasNotification: unreadTickets.length > 0,
    },
    "/staff/bda-reports": {
      title: "Rapports GC",
      description: "Litiges et conciliation entre joueurs.",
      href: "/staff/bda-reports",
      iconKey: "shield",
      stat: bdaReportsCount,
      statLabel: bdaReportsCount > 1 ? "dossiers" : "dossier",
    },
    "/staff/sanctions": {
      title: "Sanctions",
      description: "Historique et gestion des avertissements, suspensions et exclusions.",
      href: "/staff/sanctions",
      iconKey: "gavel",
      stat: activeSanctionsCount,
      statLabel: activeSanctionsCount > 1 ? "actives" : "active",
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
    "/staff/distribution": {
      title: "Distribution",
      description: "Classes de joueurs et équilibre des rôles.",
      href: "/staff/distribution",
      iconKey: "scales",
      stat: totalPlayerClassesCount,
      statLabel: totalPlayerClassesCount > 1 ? "classes" : "classe",
    },
    "/staff/rp-tracking": {
      title: "Suivi RP",
      description: "Salons de suivi des joueurs actifs.",
      href: "/staff/rp-tracking",
      iconKey: "chat",
      stat: ongoingRpTrackingCount,
      statLabel: ongoingRpTrackingCount > 1 ? "suivis en cours" : "suivi en cours",
      badge:
        pendingRpTrackingCount > 0
          ? { label: `${pendingRpTrackingCount} à traiter`, variant: "default" }
          : undefined,
      hasNotification: pendingRpTrackingCount > 0,
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
    "/staff/interview-guide": {
      title: "Guide d'entretien",
      description: "Trame vocale des entretiens whitelist.",
      href: "/staff/interview-guide",
      iconKey: "scroll",
    },
  };

  const seenHrefs = new Set<string>();
  const modules = getStaffNavGroups(user.role)
    .flatMap((group) => group.items)
    .filter((item) => {
      if (!item.roles.includes(user.role) || seenHrefs.has(item.href)) {
        return false;
      }
      seenHrefs.add(item.href);
      return true;
    })
    .map((item) => cardConfigs[item.href])
    .filter((config): config is NonNullable<typeof config> => Boolean(config));

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/80 from-card to-card/60 flex flex-col gap-4 rounded-xl border bg-gradient-to-r p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href={`/staff/atlas/${user.id}`}
            className="group flex items-center gap-3.5 transition-opacity hover:opacity-85"
            title="Voir mon profil Atlas"
          >
            {user.minecraftUuid ? (
              <SkinHead
                username={user.minecraftUsername ?? displayName}
                uuid={user.minecraftUuid}
                avatarUrl={user.minecraftAvatarUrl}
                updatedAt={user.minecraftSkinUpdatedAt}
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
              <h1 className="font-heading text-foreground text-xl font-semibold group-hover:underline">
                Espace staff de {displayName}
              </h1>
              <p className="text-muted-foreground text-xs">
                Accède aux modules de gestion du serveur sur cet espace.
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <Badge variant="default" className="px-2.5 py-1 text-xs font-medium">
              {staffRoleLabels[user.role]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-foreground text-base font-semibold tracking-tight">
            Modules staff
          </h2>
          <span className="text-muted-foreground text-xs">Tu as accès aux modules ci-dessous.</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((config) => (
            <DashboardStatCard
              key={config.href}
              title={config.title}
              description={config.description}
              href={config.href}
              iconKey={config.iconKey}
              stat={config.stat}
              statLabel={config.statLabel}
              badge={config.badge}
              hasNotification={config.hasNotification}
            />
          ))}

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
