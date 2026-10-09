import type { Metadata } from "next";
import Link from "next/link";
import { User, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  BacklogStatus,
  BdaReportStatus,
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  SanctionType,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import {
  allStaffRoles,
  backlogRoles,
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
import { Button } from "@/components/ui/button";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

export const metadata: Metadata = {
  title: "Tableau de bord Staff",
};

const staffRoles = allStaffRoles;
const atlasRoles = staffAtlasItem.roles;
const waitlistRoles: Role[] = [Role.ADMIN];
const interviewSlotRoles: Role[] = [Role.ADMIN];
const distributionRoles = rpManagementRoles;
const rpTrackingRoles = rpTrackingStaffRoles;
const bdaRoles: Role[] = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];
const backlogAccessRoles = backlogRoles;
const adminOnlyRoles: Role[] = [Role.ADMIN];

export default async function StaffDashboardPage() {
  const user = await requireRole(staffRoles);

  const canAccessAtlas = atlasRoles.includes(user.role);
  const canAccessWaitlist = waitlistRoles.includes(user.role);
  const canAccessInterviewSlots = interviewSlotRoles.includes(user.role);
  const canAccessDistribution = distributionRoles.includes(user.role);
  const canAccessRpTracking = rpTrackingRoles.includes(user.role);
  const canAccessBdaReports = bdaRoles.includes(user.role);
  const canAccessBacklog = backlogAccessRoles.includes(user.role);
  const canAccessGroups = rpManagementRoles.includes(user.role);
  const canAccessAdminModules = adminOnlyRoles.includes(user.role);

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
    activeBdaReportsCount,
    unreadBdaReportsCount,
    openBacklogTasksCount,
    userAssignedBacklogTasksCount,
    rpGroupsCount,
    newsCount,
    rulesCount,
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
      ? prisma.bdaReport.count({
          where: { status: { not: BdaReportStatus.ARCHIVED } },
        })
      : 0,
    canAccessBdaReports
      ? prisma.bdaReport.count({
          where: { status: BdaReportStatus.UNREAD },
        })
      : 0,
    canAccessBacklog
      ? prisma.backlogTask.count({
          where: { archivedAt: null, status: { not: BacklogStatus.DONE } },
        })
      : 0,
    canAccessBacklog
      ? prisma.backlogTask.count({
          where: {
            assigneeId: user.id,
            archivedAt: null,
            status: { not: BacklogStatus.DONE },
          },
        })
      : 0,
    canAccessGroups ? prisma.rpGroup.count() : 0,
    canAccessAdminModules ? prisma.news.count() : 0,
    canAccessAdminModules ? prisma.ruleArticle.count() : 0,
    canAccessAdminModules
      ? prisma.user.count({
          where: { role: { not: Role.PLAYER } },
        })
      : 0,
    canAccessAdminModules
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
    "/staff/tickets": {
      title: "Tickets",
      description: "Assistance et demandes des joueurs.",
      href: "/staff/tickets",
      iconKey: "ticket",
      stat: pendingTicketsCount > 0 ? pendingTicketsCount : totalOpenTicketsCount,
      statLabel:
        pendingTicketsCount > 0
          ? "à traiter"
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
      stat: activeBdaReportsCount,
      statLabel: activeBdaReportsCount > 1 ? "dossiers" : "dossier",
      badge:
        unreadBdaReportsCount > 0
          ? {
              label: `${unreadBdaReportsCount} non lu${unreadBdaReportsCount > 1 ? "s" : ""}`,
              variant: "destructive",
            }
          : undefined,
      hasNotification: unreadBdaReportsCount > 0,
    },
    "/staff/sanctions": {
      title: "Sanctions",
      description: "Avertissements, suspensions et exclusions.",
      href: "/staff/sanctions",
      iconKey: "gavel",
      stat: activeSanctionsCount,
      statLabel: activeSanctionsCount > 1 ? "actives" : "active",
    },
    "/staff/backlog": {
      title: "Backlog",
      description: "Tâches, bugs et évolutions du serveur.",
      href: "/staff/backlog",
      iconKey: "kanban",
      stat: openBacklogTasksCount,
      statLabel: openBacklogTasksCount > 1 ? "en cours" : "en cours",
      badge:
        userAssignedBacklogTasksCount > 0
          ? {
              label: `${userAssignedBacklogTasksCount} assignée${userAssignedBacklogTasksCount > 1 ? "s" : ""}`,
              variant: "default",
            }
          : undefined,
      hasNotification: userAssignedBacklogTasksCount > 0,
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
      hasNotification: pendingSheetsCount > 0,
    },
    "/staff/groups": {
      title: "Groupes RP",
      description: "Factions, guildes et organisations RP.",
      href: "/staff/groups",
      iconKey: "users",
      stat: rpGroupsCount,
      statLabel: rpGroupsCount > 1 ? "groupes" : "groupe",
    },
    "/staff/rp-tracking": {
      title: "Suivi RP",
      description: "Salons de suivi des joueurs actifs.",
      href: "/staff/rp-tracking",
      iconKey: "chat",
      stat: ongoingRpTrackingCount,
      statLabel: ongoingRpTrackingCount > 1 ? "en cours" : "en cours",
      badge:
        pendingRpTrackingCount > 0
          ? { label: `${pendingRpTrackingCount} à traiter`, variant: "default" }
          : undefined,
      hasNotification: pendingRpTrackingCount > 0,
    },
    "/staff/distribution": {
      title: "Distribution",
      description: "Classes de joueurs et équilibre des rôles.",
      href: "/staff/distribution",
      iconKey: "scales",
      stat: totalPlayerClassesCount,
      statLabel: totalPlayerClassesCount > 1 ? "classes" : "classe",
    },
    "/staff/waitlist": {
      title: "Liste d'attente",
      description: "Candidatures Discord & Minecraft.",
      href: "/staff/waitlist",
      iconKey: "clock",
      stat: waitlistCount,
      statLabel: "en attente",
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
    "/staff/news": {
      title: "Actualités",
      description: "Publication des annonces et news.",
      href: "/staff/news",
      iconKey: "newspaper",
      stat: newsCount,
      statLabel: newsCount > 1 ? "articles" : "article",
    },
    "/staff/rules": {
      title: "Règlement",
      description: "Gestion des sections et lois RP.",
      href: "/staff/rules",
      iconKey: "book-bookmark",
      stat: rulesCount,
      statLabel: rulesCount > 1 ? "articles" : "article",
    },
    "/staff/staff-team": {
      title: "Équipe staff",
      description: "Permissions et rôles de l'équipe.",
      href: "/staff/staff-team",
      iconKey: "shield-check",
      stat: staffMembersCount,
      statLabel: staffMembersCount > 1 ? "membres" : "membre",
    },
    "/staff/statistics": {
      title: "Statistiques",
      description: "Admission, activité jeu, fiches et support.",
      href: "/staff/statistics",
      iconKey: "chart",
      stat: "Analytique",
    },
    "/staff/settings": {
      title: "Paramètres",
      description: "Configuration globale et Discord.",
      href: "/staff/settings",
      iconKey: "gear",
      stat: "Système",
    },
  };

  const navGroups = getStaffNavGroups(user.role);
  const dashboardSections = navGroups
    .map((group) => ({
      title: group.title,
      items: group.items
        .filter((item) => item.href !== "/staff" && Boolean(cardConfigs[item.href]))
        .map((item) => cardConfigs[item.href]!),
    }))
    .filter((group) => group.items.length > 0);

  const urgentActions = [
    pendingTicketsCount > 0 && {
      label: `${pendingTicketsCount} ticket${pendingTicketsCount > 1 ? "s" : ""} à traiter`,
      href: "/staff/tickets",
      variant: "destructive" as const,
    },
    unreadBdaReportsCount > 0 && {
      label: `${unreadBdaReportsCount} dossier${unreadBdaReportsCount > 1 ? "s" : ""} GC non lu${unreadBdaReportsCount > 1 ? "s" : ""}`,
      href: "/staff/bda-reports",
      variant: "destructive" as const,
    },
    pendingSheetsCount > 0 && {
      label: `${pendingSheetsCount} fiche${pendingSheetsCount > 1 ? "s" : ""} à évaluer`,
      href: "/staff/atlas",
      variant: "secondary" as const,
    },
    pendingRpTrackingCount > 0 && {
      label: `${pendingRpTrackingCount} suivi${pendingRpTrackingCount > 1 ? "s" : ""} RP à traiter`,
      href: "/staff/rp-tracking",
      variant: "secondary" as const,
    },
    waitlistCount > 0 && {
      label: `${waitlistCount} candidature${waitlistCount > 1 ? "s" : ""} en attente`,
      href: "/staff/waitlist",
      variant: "secondary" as const,
    },
    userAssignedBacklogTasksCount > 0 && {
      label: `${userAssignedBacklogTasksCount} tâche${userAssignedBacklogTasksCount > 1 ? "s" : ""} assignée${userAssignedBacklogTasksCount > 1 ? "s" : ""}`,
      href: "/staff/backlog",
      variant: "outline" as const,
    },
  ].filter((action): action is { label: string; href: string; variant: "destructive" | "secondary" | "outline" } =>
    Boolean(action)
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Bannière d'accueil compacte */}
      <div className="border-border/80 from-card to-card/60 flex flex-col gap-3 rounded-xl border bg-gradient-to-r p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/staff/atlas/${user.id}`}
          className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-85"
          title="Voir mon profil Atlas"
        >
          {user.minecraftUuid ? (
            <SkinHead
              username={user.minecraftUsername ?? displayName}
              uuid={user.minecraftUuid}
              avatarUrl={user.minecraftAvatarUrl}
              updatedAt={user.minecraftSkinUpdatedAt}
              size="lg"
              className="ring-border shrink-0 shadow-xs ring-1"
            />
          ) : (
            <Avatar className="ring-border size-10 shrink-0 shadow-xs ring-1">
              <AvatarImage src={user.discordAvatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="text-sm font-semibold">{initial}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-foreground truncate text-lg font-semibold group-hover:underline">
                {displayName}
              </h1>
              <Badge variant="default" className="shrink-0 px-2 py-0 text-[11px] font-medium">
                {staffRoleLabels[user.role]}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              Espace de gestion et supervision de Hyori RP
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
            render={<Link href="/player" />}
          >
            <User className="text-primary size-3.5 shrink-0" />
            <span>Espace Joueur</span>
          </Button>
        </div>
      </div>

      {/* Raccourcis d'actions prioritaires si éléments en attente */}
      {urgentActions.length > 0 && (
        <div className="border-border/70 bg-card/50 flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2.5">
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs font-medium">
            <WarningCircle className="text-primary size-3.5 shrink-0" />
            <span>À traiter :</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {urgentActions.map((action) => (
              <Link key={action.href} href={action.href} className="focus:outline-hidden">
                <Badge
                  variant={action.variant}
                  className="hover:border-primary/50 cursor-pointer px-2 py-0.5 text-xs font-medium transition-colors"
                >
                  {action.label}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sections de modules organisées comme la sidebar */}
      <div className="flex flex-col gap-5">
        {dashboardSections.map((section) => (
          <div key={section.title ?? "modules"} className="flex flex-col gap-2.5">
            {section.title && (
              <div className="flex items-center gap-2">
                <h2 className="text-foreground/75 font-heading text-xs font-semibold uppercase tracking-wider">
                  {section.title}
                </h2>
                <span className="bg-border/60 h-px flex-1" />
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((card) => (
                <DashboardStatCard key={card.href} compact {...card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
