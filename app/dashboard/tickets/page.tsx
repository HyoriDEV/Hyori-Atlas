import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { staffNavItems, ticketCategoryLabels } from "@/lib/navigation";
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
import { TicketFilters } from "@/components/dashboard/ticket-filters";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";

const PAGE_SIZE = 10;

export default async function TicketsStaffListPage(props: {
  searchParams: Promise<{ category?: string; status?: string; page?: string }>;
}) {
  const item = staffNavItems.find((i) => i.href === "/dashboard/tickets")!;
  await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const category = Object.values(TicketCategory).includes(searchParams.category as TicketCategory)
    ? (searchParams.category as TicketCategory)
    : undefined;
  const isArchived = searchParams.status === "ARCHIVED";

  const where: Prisma.TicketWhereInput = {
    ...(category ? { category } : {}),
    status: isArchived ? TicketStatus.ARCHIVED : { not: TicketStatus.ARCHIVED },
  };

  const [totalCount, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: { player: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">
          Tickets <span className="text-muted-foreground text-base">({totalCount})</span>
        </h1>
        <TicketFilters category={category} status={isArchived ? "ARCHIVED" : "OPEN"} />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Intitulé</TableHead>
              <TableHead>Dernier message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun ticket.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TicketTableRow
                  key={ticket.id}
                  href={`/dashboard/tickets/${ticket.id}`}
                  className={
                    ticket.status === TicketStatus.PENDING_STAFF
                      ? "bg-primary/[0.07] hover:bg-primary/[0.12]"
                      : undefined
                  }
                >
                  <TableCell>
                    {ticket.player.minecraftUsername ?? ticket.player.discordDisplayName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {ticketCategoryLabels[ticket.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(ticket.updatedAt, { style: "prefix-long", withTime: true })}
                  </TableCell>
                </TicketTableRow>
              ))
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
