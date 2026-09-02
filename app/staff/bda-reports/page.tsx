import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { Role, BdaReportStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { UnreadDot } from "@/components/ui/unread-dot";
import { bdaReportStatusBadgeVariant } from "@/lib/atlas-status";
import { bdaReportStatusLabels } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const bdaRoles = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export default async function BdaReportsPage(props: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  await requireRole(bdaRoles);

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const isArchived = searchParams.tab === "archived";

  const [activeCount, archivedCount, reports] = await Promise.all([
    prisma.bdaReport.count({
      where: { status: { not: BdaReportStatus.ARCHIVED } },
    }),
    prisma.bdaReport.count({
      where: { status: BdaReportStatus.ARCHIVED },
    }),
    prisma.bdaReport.findMany({
      where: {
        status: isArchived ? BdaReportStatus.ARCHIVED : { not: BdaReportStatus.ARCHIVED },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalCount = isArchived ? archivedCount : activeCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const { getGlobalSettings } = await import("@/lib/services/settings-service");
  const settings = await getGlobalSettings();
  const creationEnabled = settings.bdaReportSubmissionEnabled;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Rapports GC</h1>
        {creationEnabled ? (
          <Link href="/staff/bda-reports/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rapport
          </Link>
        ) : (
          <Button disabled title="La création de rapports est temporairement désactivée.">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rapport
          </Button>
        )}
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
              <TableHead className="pl-6">Intitulé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière modification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun rapport.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const isUnread = report.status === BdaReportStatus.UNREAD;
                return (
                  <TicketTableRow key={report.id} href={`/staff/bda-reports/${report.id}`}>
                    <TableCell className="relative pl-6 font-medium">
                      {isUnread && (
                        <UnreadDot
                          variant="destructive"
                          placement="table"
                          title="Non lu"
                        />
                      )}
                      <span>{report.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={bdaReportStatusBadgeVariant(report.status)}
                        className="text-xs"
                      >
                        {bdaReportStatusLabels[report.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(report.updatedAt, { style: "prefix-long", withTime: true })}
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
