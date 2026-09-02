import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { staffNavItems, ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default async function TicketsStaffListPage(props: {
  searchParams: Promise<{ category?: string; tab?: string; page?: string }>;
}) {
  const item = staffNavItems.find((i) => i.href === "/staff/tickets")!;
  await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const category = Object.values(TicketCategory).includes(searchParams.category as TicketCategory)
    ? (searchParams.category as TicketCategory)
    : undefined;
  const isArchived = searchParams.tab === "archived";
  const catFilter = category ? { category } : {};

  const [activeCount, archivedCount, tickets] = await Promise.all([
    prisma.ticket.count({
      where: { ...catFilter, status: { not: TicketStatus.ARCHIVED } },
    }),
    prisma.ticket.count({
      where: { ...catFilter, status: TicketStatus.ARCHIVED },
    }),
    prisma.ticket.findMany({
      where: {
        ...catFilter,
        status: isArchived ? TicketStatus.ARCHIVED : { not: TicketStatus.ARCHIVED },
      },
      include: { player: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalCount = isArchived ? archivedCount : activeCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Tickets</h1>
        <TicketFilters category={category} />
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
              <TableHead>Catégorie</TableHead>
              <TableHead>Intitulé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernier message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun ticket.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const isPendingStaff = ticket.status === TicketStatus.PENDING_STAFF;
                return (
                  <TicketTableRow key={ticket.id} href={`/staff/tickets/${ticket.id}`}>
                    <TableCell className="relative pl-6">
                      {isPendingStaff && (
                        <UnreadDot placement="table" title="En attente du staff" />
                      )}
                      <span className="font-medium">
                        {ticket.player.minecraftUsername ?? ticket.player.discordDisplayName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ticketCategoryLabels[ticket.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant={ticketStatusBadgeVariant(ticket.status)} className="text-xs">
                        {ticketStatusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.updatedAt, { style: "prefix-long", withTime: true })}
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
          pageSize={PAGE_SIZE}
          paramName="page"
        />
      </Card>
    </div>
  );
}
