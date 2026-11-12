import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
import { formatTicketCategoryName, staffNavItems } from "@/lib/navigation";
import { getUnreadTickets, hasTechnicalTicketAccess, ticketAccessWhere } from "@/lib/ticket-access";
import { DEFAULT_TICKET_VIEW, TICKET_VIEWS, type TicketView } from "@/lib/ticket-list";
import { getTicketSuspendedBadgeClasses, ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate, formatDaysSince, getDaysSince } from "@/lib/date";
import { cn, truncate } from "@/lib/utils";
import {
  MessageAuthorType,
  RegistrationStatus,
  Role,
  TicketCategory,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Clock } from "@phosphor-icons/react/dist/ssr";
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
import { TicketListCreateMenu } from "@/components/staff/tickets/ticket-list-create-menu";
import type { PlayerOption } from "@/components/player-select";

const DEFAULT_PAGE_SIZE = 10;
const LAST_MESSAGE_PREVIEW_LENGTH = 90;

type SortKey = "player" | "category" | "status" | "activity" | "created" | "suspended";
type SortDirection = "asc" | "desc";

const VALID_SORT_KEYS: SortKey[] = [
  "player",
  "category",
  "status",
  "activity",
  "created",
  "suspended",
];

function getViewFilter(view: TicketView): Prisma.TicketWhereInput {
  switch (view) {
    case "active":
      return { status: { not: TicketStatus.ARCHIVED }, suspendedAt: null };
    case "suspended":
      return { status: { not: TicketStatus.ARCHIVED }, suspendedAt: { not: null } };
    case "archived":
      return { status: TicketStatus.ARCHIVED };
  }
}

type PageProps = {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    category?: string;
    sort?: string;
    dir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function buildOrderBy(
  sortKey: SortKey | null,
  sortDir: SortDirection,
  view: TicketView
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
    case "suspended":
      return [{ suspendedAt: sortDir }, { lastMessageAt: "desc" }];
    case "activity":
      return [{ lastMessageAt: sortDir }];
    case "created":
      return [{ createdAt: sortDir }];
    default:
      if (view === "suspended") {
        return [{ suspendedAt: "asc" }, { lastMessageAt: "desc" }];
      }
      return [{ status: "asc" }, { lastMessageAt: "desc" }];
  }
}

export default async function TicketsStaffListPage(props: PageProps) {
  const item = staffNavItems.find((i) => i.href === "/staff/tickets")!;
  const staffUser = await requireRole(item.roles);
  const isAdmin = staffUser.role === Role.ADMIN;
  const canOpenTicket = true;

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const rawSavedPrefs = getServerPagePrefs(cookieStore, "/staff/tickets");
  const savedPrefs = { ...rawSavedPrefs };
  if (savedPrefs.tab && !TICKET_VIEWS.includes(savedPrefs.tab as TicketView)) {
    delete savedPrefs.tab;
  }
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
  const categoryParam = searchParams.category?.trim() || undefined;

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
  if (categoryParam) {
    if (categoryParam.toLowerCase() === "rp") {
      filters.push({
        OR: [
          { category: TicketCategory.RP },
          { categoryRef: { slug: "rp" } },
          { categoryName: { in: ["Roleplay", "Ticket RP"], mode: "insensitive" } },
        ],
      });
    } else if (categoryParam.toLowerCase() === "technique") {
      filters.push({
        OR: [
          { category: TicketCategory.TECHNIQUE },
          { categoryRef: { slug: "technique" } },
          { categoryName: { in: ["Technique", "Ticket technique"], mode: "insensitive" } },
        ],
      });
    } else {
      filters.push({
        OR: [
          { categoryRef: { slug: categoryParam } },
          { categoryName: { equals: categoryParam, mode: "insensitive" } },
        ],
      });
    }
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

  const hasActiveFilters = Boolean(query || categoryParam);

  const [
    activeCount,
    suspendedCount,
    archivedCount,
    tickets,
    contactablePlayers,
    categoryConfigs,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { AND: [...filters, getViewFilter("active")] },
    }),
    prisma.ticket.count({
      where: { AND: [...filters, getViewFilter("suspended")] },
    }),
    prisma.ticket.count({
      where: { AND: [...filters, getViewFilter("archived")] },
    }),
    prisma.ticket.findMany({
      where: { AND: [...filters, getViewFilter(view)] },
      include: {
        player: true,
        conversation: {
          select: {
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
      orderBy: buildOrderBy(sortKey, sortDir, view),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    canOpenTicket
      ? prisma.user.findMany({
          where: {
            role: Role.PLAYER,
            registrationStatus: { not: RegistrationStatus.REJECTED },
          },
          select: {
            id: true,
            minecraftUsername: true,
            discordDisplayName: true,
            discordUsername: true,
            discordAvatarUrl: true,
            role: true,
            registrationStatus: true,
            characterSheets: { select: { name: true, status: true } },
          },
          orderBy: { discordDisplayName: "asc" },
        })
      : Promise.resolve([]),
    prisma.ticketCategoryConfig.findMany({
      where: {
        enabled: true,
        ...(!hasTechnicalTicketAccess(staffUser.role)
          ? {
              slug: { notIn: ["technique", "tech", "dev"] },
            }
          : {}),
      },
      select: { slug: true, name: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const viewCounts: Record<TicketView, number> = {
    active: activeCount,
    suspended: suspendedCount,
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

  const columnCount = 6;

  return (
    <div className="flex flex-col gap-6">
      <TicketListRefresher />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Tickets</h1>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <TicketFilters
            query={query}
            category={categoryParam}
            hasActiveSort={Boolean(sortKey)}
            availableCategories={categoryConfigs}
          />
          <TicketListCreateMenu
            availablePlayers={contactablePlayers as PlayerOption[]}
            canOpenTicket={canOpenTicket}
          />
        </div>
      </div>

      <ViewTabs
        mobileSelect
        activeView={view}
        defaultView={DEFAULT_TICKET_VIEW}
        tabs={[
          { value: "active", label: "Actifs", count: viewCounts.active },
          { value: "suspended", label: "En suspens", count: viewCounts.suspended },
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
                  sortKey={view === "suspended" ? "suspended" : "status"}
                  defaultDirection="asc"
                  label={view === "suspended" ? "En suspens depuis" : "Statut"}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="activity"
                  defaultDirection="desc"
                  label="Dernière activité"
                />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
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
                      <div className="flex max-w-[55vw] min-w-0 flex-col gap-0.5 sm:max-w-md">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={cn("truncate", isUnread ? "font-semibold" : "font-medium")}
                            title={ticket.subject}
                          >
                            {ticket.subject}
                          </span>
                          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                            {formatTicketCategoryName(ticket.categoryName) || "Ticket"}
                            {ticket.subcategoryName ? ` · ${ticket.subcategoryName}` : ""}
                          </Badge>
                        </div>
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
                      {ticket.suspendedAt ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-xs whitespace-nowrap",
                            getTicketSuspendedBadgeClasses(getDaysSince(ticket.suspendedAt))
                          )}
                          title={`Mis en suspens le ${formatDate(ticket.suspendedAt, { style: "prefix-long", withTime: true })}`}
                        >
                          <Clock className="size-3 shrink-0" />
                          <span>En suspens · {formatDaysSince(ticket.suspendedAt)}</span>
                        </Badge>
                      ) : (
                        <Badge variant={ticketStatusBadgeVariant(ticket.status)} className="text-xs">
                          {ticket.status === "PENDING_STAFF"
                            ? "Staff"
                            : ticket.status === "PENDING_PLAYER"
                              ? "Joueur"
                              : "Archivé"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden whitespace-nowrap md:table-cell">
                      {formatDate(ticket.lastMessageAt, { style: "compact" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden whitespace-nowrap xl:table-cell">
                      {formatDate(ticket.createdAt, { style: "compact" })}
                    </TableCell>
                    <TableCell className="w-10 pr-4">
                      <TicketRowActions
                        ticketId={ticket.id}
                        status={ticket.status}
                        isSuspended={Boolean(ticket.suspendedAt)}
                        isUnread={isUnread}
                        isAdmin={isAdmin}
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
