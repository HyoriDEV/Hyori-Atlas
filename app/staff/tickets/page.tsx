import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tickets Staff",
};
import {
  getServerPagePrefs,
  checkRedirectWithSavedPrefs,
  resolvePageSize,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/lib/table-preferences";
import {
  staffNavItems,
  ticketCategoryLabels,
  ticketStatusLabels,
  ticketSummonableTeams,
  ticketTeamShortLabels,
} from "@/lib/navigation";
import { getUnreadTickets, hasFullTicketAccess, ticketAccessWhere } from "@/lib/ticket-access";
import {
  DEFAULT_TICKET_VIEW,
  TICKET_READ_FILTER_UNREAD,
  TICKET_TEAM_FILTER_NONE,
  TICKET_VIEWS,
  type TicketView,
} from "@/lib/ticket-list";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { cn, truncate } from "@/lib/utils";
import {
  MessageAuthorType,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { SortHeader } from "@/components/dashboard/waitlist-sort-controls";
import { ViewTabs } from "@/components/dashboard/view-tabs";
import { TicketFilters } from "@/components/dashboard/ticket-filters";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { TicketRowActions } from "@/components/dashboard/ticket-row-actions";
import { TicketListRefresher } from "@/components/dashboard/ticket-list-refresher";
import { UnreadDot } from "@/components/ui/unread-dot";
import { MarkAllTicketsReadButton } from "@/components/staff/mark-all-tickets-read-button";

const DEFAULT_PAGE_SIZE = 10;
const LAST_MESSAGE_PREVIEW_LENGTH = 90;

type SortKey = "player" | "category" | "status" | "activity" | "created";
type SortDirection = "asc" | "desc";

const VALID_SORT_KEYS: SortKey[] = ["player", "category", "status", "activity", "created"];

const VIEW_STATUS_FILTER: Record<TicketView, Prisma.TicketWhereInput> = {
  active: { status: { not: TicketStatus.ARCHIVED } },
  staff: { status: TicketStatus.PENDING_STAFF },
  player: { status: TicketStatus.PENDING_PLAYER },
  archived: { status: TicketStatus.ARCHIVED },
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    category?: string;
    read?: string;
    team?: string;
    sort?: string;
    dir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function buildOrderBy(
  sortKey: SortKey | null,
  sortDir: SortDirection
): Prisma.TicketOrderByWithRelationInput[] {
  switch (sortKey) {
    case "player":
      return [
        { player: { minecraftUsername: { sort: sortDir, nulls: "last" } } },
        { player: { discordDisplayName: sortDir } },
      ];
    case "category":
      return [{ category: sortDir }, { lastMessageAt: "desc" }];
    case "status":
      return [{ status: sortDir }, { lastMessageAt: "desc" }];
    case "activity":
      return [{ lastMessageAt: sortDir }];
    case "created":
      return [{ createdAt: sortDir }];
    default:
      return [{ status: "asc" }, { lastMessageAt: "desc" }];
  }
}

export default async function TicketsStaffListPage(props: PageProps) {
  const item = staffNavItems.find((i) => i.href === "/staff/tickets")!;
  const staffUser = await requireRole(item.roles);
  const canManageAccess = hasFullTicketAccess(staffUser.role);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/tickets");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/tickets", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(searchParams.pageSize, savedPrefs.pageSize, DEFAULT_PAGE_SIZE);
  const view: TicketView = TICKET_VIEWS.includes(searchParams.tab as TicketView)
    ? (searchParams.tab as TicketView)
    : DEFAULT_TICKET_VIEW;
  const category = Object.values(TicketCategory).includes(searchParams.category as TicketCategory)
    ? (searchParams.category as TicketCategory)
    : undefined;
  const unreadOnly = searchParams.read === TICKET_READ_FILTER_UNREAD;

  // Le filtre par accès n'existe que pour les rôles à accès complet : les autres équipes
  // ne doivent rien pouvoir déduire des convocations.
  const teamParam = canManageAccess ? searchParams.team : undefined;
  const teamFilter = ticketSummonableTeams.includes(teamParam as Role)
    ? (teamParam as Role)
    : undefined;
  const noAccessGrantedOnly = teamParam === TICKET_TEAM_FILTER_NONE;

  const rawSortKey = searchParams.sort as SortKey | undefined;
  const sortKey: SortKey | null =
    rawSortKey && VALID_SORT_KEYS.includes(rawSortKey) ? rawSortKey : null;
  const sortDir: SortDirection = searchParams.dir === "desc" ? "desc" : "asc";

  const unreadTickets = await getUnreadTickets(staffUser);
  const unreadTicketIds = new Set(unreadTickets.map((t) => t.id));

  const nameContains = { contains: query, mode: "insensitive" as const };
  const userMatchesQuery: Prisma.UserWhereInput = {
    OR: [
      { minecraftUsername: nameContains },
      { discordDisplayName: nameContains },
      { discordUsername: nameContains },
    ],
  };

  const filters: Prisma.TicketWhereInput[] = [ticketAccessWhere(staffUser)];
  if (category) {
    filters.push({ category });
  }
  if (unreadOnly) {
    filters.push({ id: { in: [...unreadTicketIds] } });
  }
  if (teamFilter) {
    filters.push({ teamSummons: { some: { team: teamFilter } } });
  }
  if (noAccessGrantedOnly) {
    filters.push({ teamSummons: { none: {} }, staffAccesses: { none: {} } });
  }
  if (query) {
    filters.push({
      OR: [
        { subject: nameContains },
        { player: userMatchesQuery },
        { conversation: { members: { some: { user: userMatchesQuery } } } },
      ],
    });
  }

  const hasActiveFilters = Boolean(
    query || category || unreadOnly || teamFilter || noAccessGrantedOnly
  );

  const [statusCounts, tickets] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      where: { AND: filters },
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: { AND: [...filters, VIEW_STATUS_FILTER[view]] },
      include: {
        player: true,
        teamSummons: { select: { team: true } },
        _count: { select: { staffAccesses: true } },
        conversation: {
          select: {
            _count: {
              select: {
                messages: {
                  where: { deletedAt: null, authorType: { not: MessageAuthorType.SYSTEM } },
                },
              },
            },
            members: {
              where: { user: { role: Role.PLAYER } },
              select: { userId: true },
            },
            messages: {
              where: { deletedAt: null, authorType: { not: MessageAuthorType.SYSTEM } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                body: true,
                imageUrl: true,
                authorId: true,
                author: { select: { minecraftUsername: true, discordDisplayName: true } },
              },
            },
          },
        },
      },
      orderBy: buildOrderBy(sortKey, sortDir),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const countByStatus = (status: TicketStatus) =>
    statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;
  const pendingStaffCount = countByStatus(TicketStatus.PENDING_STAFF);
  const pendingPlayerCount = countByStatus(TicketStatus.PENDING_PLAYER);
  const archivedCount = countByStatus(TicketStatus.ARCHIVED);

  const viewCounts: Record<TicketView, number> = {
    active: pendingStaffCount + pendingPlayerCount,
    staff: pendingStaffCount,
    player: pendingPlayerCount,
    archived: archivedCount,
  };

  const totalCount = viewCounts[view];
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const sortHeaderProps = {
    activeSortKey: sortKey ?? undefined,
    dirParamName: "dir",
    keyParamName: "sort",
    resetParamNames: ["page"],
    currentSort: sortDir,
  };

  const columnCount = canManageAccess ? 9 : 8;

  return (
    <div className="flex flex-col gap-6">
      <TicketListRefresher />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Tickets</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TicketFilters
            query={query}
            category={category}
            read={unreadOnly ? TICKET_READ_FILTER_UNREAD : undefined}
            team={teamFilter ?? (noAccessGrantedOnly ? TICKET_TEAM_FILTER_NONE : undefined)}
            showTeamFilter={canManageAccess}
            hasActiveSort={Boolean(sortKey)}
          />
          <MarkAllTicketsReadButton />
        </div>
      </div>

      <ViewTabs
        activeView={view}
        defaultView={DEFAULT_TICKET_VIEW}
        tabs={[
          { value: "active", label: "Tous les actifs", count: viewCounts.active },
          { value: "staff", label: "À traiter", count: viewCounts.staff },
          { value: "player", label: "En attente du joueur", count: viewCounts.player },
          { value: "archived", label: "Archivés", count: viewCounts.archived },
        ]}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Ticket</TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="player"
                  defaultDirection="asc"
                  label="Joueur"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="category"
                  defaultDirection="asc"
                  label="Catégorie"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="status"
                  defaultDirection="asc"
                  label="Statut"
                />
              </TableHead>
              {canManageAccess && <TableHead>Accès staff</TableHead>}
              <TableHead>Messages</TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="activity"
                  defaultDirection="desc"
                  label="Dernière activité"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="created"
                  defaultDirection="desc"
                  label="Création"
                />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  {hasActiveFilters ? "Aucun ticket ne correspond à ces filtres." : "Aucun ticket."}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const isUnread = unreadTicketIds.has(ticket.id);
                const playerName =
                  ticket.player.minecraftUsername ?? ticket.player.discordDisplayName;
                const otherMembersCount = ticket.conversation.members.filter(
                  (member) => member.userId !== ticket.playerId
                ).length;
                const lastMessage = ticket.conversation.messages[0];
                const lastMessageAuthor = lastMessage
                  ? lastMessage.authorId === staffUser.id
                    ? "Moi"
                    : (lastMessage.author?.minecraftUsername ??
                      lastMessage.author?.discordDisplayName ??
                      "Inconnu")
                  : null;
                const lastMessageText = lastMessage
                  ? lastMessage.body
                    ? truncate(lastMessage.body.replace(/\s+/g, " "), LAST_MESSAGE_PREVIEW_LENGTH)
                    : lastMessage.imageUrl
                      ? "Image"
                      : ""
                  : null;

                return (
                  <TicketTableRow key={ticket.id} href={`/staff/tickets/${ticket.id}`}>
                    <TableCell className="relative max-w-md pl-6">
                      {isUnread && <UnreadDot placement="table" title="Non lu" />}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={cn("truncate", isUnread ? "font-semibold" : "font-medium")}
                          title={ticket.subject}
                        >
                          {ticket.subject}
                        </span>
                        {lastMessage && (
                          <span
                            className={cn(
                              "truncate text-xs",
                              isUnread ? "text-foreground/80" : "text-muted-foreground"
                            )}
                          >
                            {lastMessageAuthor} : {lastMessageText}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        {ticket.player.minecraftUsername ? (
                          <SkinHead
                            size="sm"
                            username={ticket.player.minecraftUsername}
                            className="shrink-0"
                          />
                        ) : (
                          <Avatar size="sm" className="shrink-0">
                            <AvatarImage
                              src={ticket.player.discordAvatarUrl ?? undefined}
                              alt={playerName}
                            />
                            <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="font-medium">{playerName}</span>
                        {otherMembersCount > 0 && (
                          <span
                            className="text-muted-foreground text-xs"
                            title={`${otherMembersCount} autre(s) membre(s)`}
                          >
                            +{otherMembersCount}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ticketCategoryLabels[ticket.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ticketStatusBadgeVariant(ticket.status)} className="text-xs">
                        {ticketStatusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    {canManageAccess && (
                      <TableCell>
                        {ticket.teamSummons.length === 0 && ticket._count.staffAccesses === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {ticketSummonableTeams
                              .filter((team) => ticket.teamSummons.some((s) => s.team === team))
                              .map((team) => (
                                <Badge
                                  key={team}
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {ticketTeamShortLabels[team]}
                                </Badge>
                              ))}
                            {ticket._count.staffAccesses > 0 && (
                              <span
                                className="text-muted-foreground text-xs"
                                title="Staff ajoutés individuellement"
                              >
                                +{ticket._count.staffAccesses} staff
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ChatCircle className="size-3.5" />
                        {ticket.conversation._count.messages}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(ticket.lastMessageAt, { style: "chat" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(ticket.createdAt, {
                        style: "compact",
                        withTime: false,
                        withYear: true,
                      })}
                    </TableCell>
                    <TableCell className="w-10 pr-4">
                      <TicketRowActions
                        ticketId={ticket.id}
                        status={ticket.status}
                        isUnread={isUnread}
                      />
                    </TableCell>
                  </TicketTableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          paramName="page"
          sizeParamName="pageSize"
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        />
      </Card>
    </div>
  );
}
