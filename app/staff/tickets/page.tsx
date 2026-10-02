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
import { staffNavItems, ticketCategoryLabels } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { truncate } from "@/lib/utils";
import { Role, TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
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
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { TicketFilters } from "@/components/dashboard/ticket-filters";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { UnreadDot } from "@/components/ui/unread-dot";
import { MarkAllTicketsReadButton } from "@/components/staff/mark-all-tickets-read-button";

const DEFAULT_PAGE_SIZE = 10;

export default async function TicketsStaffListPage(props: {
  searchParams: Promise<{ category?: string; tab?: string; page?: string; pageSize?: string }>;
}) {
  const item = staffNavItems.find((i) => i.href === "/staff/tickets")!;
  const staffUser = await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/tickets");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/tickets", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(searchParams.pageSize, savedPrefs.pageSize, DEFAULT_PAGE_SIZE);
  const category = Object.values(TicketCategory).includes(searchParams.category as TicketCategory)
    ? (searchParams.category as TicketCategory)
    : undefined;
  const isArchived = searchParams.tab === "archived";

  const isRpStaff = staffUser.role === Role.RP_TRACKING;
  const rpFilter = isRpStaff ? { rpTrackingAccess: true } : {};
  const catFilter = category ? { category } : {};
  const baseFilter = { ...catFilter, ...rpFilter };

  const [activeCount, archivedCount, tickets] = await Promise.all([
    prisma.ticket.count({
      where: { ...baseFilter, status: { not: TicketStatus.ARCHIVED } },
    }),
    prisma.ticket.count({
      where: { ...baseFilter, status: TicketStatus.ARCHIVED },
    }),
    prisma.ticket.findMany({
      where: {
        ...baseFilter,
        status: isArchived ? TicketStatus.ARCHIVED : { not: TicketStatus.ARCHIVED },
      },
      include: {
        player: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalCount = isArchived ? archivedCount : activeCount;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          {isRpStaff ? "Tickets (Suivi RP)" : "Tickets"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {!isRpStaff && <MarkAllTicketsReadButton />}
          <TicketFilters category={category} />
        </div>
      </div>

      <StatusTabs
        activeTab={isArchived ? "archived" : "active"}
        activeCount={activeCount}
        archivedCount={archivedCount}
        activeLabel="Actifs"
        archivedLabel="Archivés"
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Joueur</TableHead>
              <TableHead className="w-24">Statut</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Intitulé</TableHead>
              <TableHead>Modification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">
                  {isRpStaff
                    ? "Aucun ticket convoqué pour le suivi RP."
                    : "Aucun ticket."}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const isPendingStaff = ticket.status === TicketStatus.PENDING_STAFF;
                const playerName =
                  ticket.player.minecraftUsername ?? ticket.player.discordDisplayName;
                return (
                  <TicketTableRow key={ticket.id} href={`/staff/tickets/${ticket.id}`}>
                    <TableCell className="relative pl-6">
                      {isPendingStaff && (
                        <UnreadDot placement="table" title="En attente du staff" />
                      )}
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {ticket.status === TicketStatus.PENDING_STAFF ? (
                          <Badge
                            variant="default"
                            className="px-2 py-0.5 text-[11px] font-medium leading-none"
                          >
                            Staff
                          </Badge>
                        ) : ticket.status === TicketStatus.PENDING_PLAYER ? (
                          <Badge
                            variant="secondary"
                            className="text-muted-foreground px-2 py-0.5 text-[11px] font-medium leading-none"
                          >
                            Joueur
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground/70 px-2 py-0.5 text-[11px] font-medium leading-none"
                          >
                            Archivé
                          </Badge>
                        )}
                        {ticket.rpTrackingAccess && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-600 dark:text-amber-400 px-1.5 py-0 text-[10px]"
                          >
                            RP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ticketCategoryLabels[ticket.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium" title={ticket.subject}>
                      {truncate(ticket.subject, 50)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.updatedAt, { style: "prefix-short", withTime: true })}
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
