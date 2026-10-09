import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  Role,
  SanctionSource,
  SanctionType,
} from "@/lib/generated/prisma/enums";
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  checkRedirectWithSavedPrefs,
  getServerPagePrefs,
  resolvePageSize,
} from "@/lib/table-preferences";
import { formatDate } from "@/lib/date";
import {
  sanctionSourceLabels,
  sanctionTypeLabels,
} from "@/lib/navigation";
import {
  sanctionStatusBadgeVariant,
  sanctionTypeBadgeVariant,
} from "@/lib/atlas-status";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SanctionsFilters } from "@/components/staff/sanctions/sanctions-filters";
import {
  SanctionRowActions,
  type SanctionRowData,
} from "@/components/staff/sanctions/sanction-row-actions";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { SortHeader } from "@/components/dashboard/waitlist-sort-controls";

export const metadata: Metadata = {
  title: "Sanctions",
};

const DEFAULT_PAGE_SIZE = 10;

type SortKey =
  | "createdAt"
  | "player"
  | "type"
  | "reason"
  | "status"
  | "issuedBy"
  | "expiresAt";

type SortDirection = "asc" | "desc";

const VALID_SORT_KEYS: SortKey[] = [
  "createdAt",
  "player",
  "type",
  "reason",
  "status",
  "issuedBy",
  "expiresAt",
];

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    source?: string;
    sort?: string;
    dir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function SanctionsPage(props: PageProps) {
  // Page accessible UNIQUEMENT aux administrateurs
  await requireRole([Role.ADMIN]);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/sanctions");
  const redirectUrl = checkRedirectWithSavedPrefs(
    "/staff/sanctions",
    searchParams,
    savedPrefs
  );
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";
  const typeParam = searchParams.type;
  const statusParam = searchParams.status;
  const sourceParam = searchParams.source;

  const rawSortKey = searchParams.sort as SortKey | undefined;
  // Par défaut : de la plus récente à la plus ancienne (createdAt desc)
  const sortKey: SortKey =
    rawSortKey && VALID_SORT_KEYS.includes(rawSortKey) ? rawSortKey : "createdAt";
  const sortDir: SortDirection =
    searchParams.dir === "asc"
      ? "asc"
      : searchParams.dir === "desc"
        ? "desc"
        : sortKey === "createdAt"
          ? "desc"
          : "asc";

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(
    searchParams.pageSize,
    savedPrefs.pageSize,
    DEFAULT_PAGE_SIZE
  );

  const now = new Date();



  // Construction des conditions de filtrage
  const conditions: Prisma.SanctionWhereInput[] = [];

  if (query) {
    conditions.push({
      OR: [
        { user: { minecraftUsername: { contains: query, mode: "insensitive" } } },
        { user: { discordDisplayName: { contains: query, mode: "insensitive" } } },
        { user: { discordUsername: { contains: query, mode: "insensitive" } } },
        { issuedByName: { contains: query, mode: "insensitive" } },
        { revokedByName: { contains: query, mode: "insensitive" } },
        { reason: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (typeParam && Object.values(SanctionType).includes(typeParam as SanctionType)) {
    conditions.push({ type: typeParam as SanctionType });
  }

  if (sourceParam && Object.values(SanctionSource).includes(sourceParam as SanctionSource)) {
    conditions.push({ source: sourceParam as SanctionSource });
  }

  if (statusParam === "ACTIVE") {
    conditions.push({
      revokedAt: null,
      OR: [
        { type: { in: [SanctionType.WARNING, SanctionType.EXCLUSION] } },
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    });
  } else if (statusParam === "EXPIRED") {
    conditions.push({
      revokedAt: null,
      expiresAt: { lte: now },
    });
  } else if (statusParam === "REVOKED") {
    conditions.push({
      revokedAt: { not: null },
    });
  }

  const whereClause: Prisma.SanctionWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  // Récupération des sanctions avec relations
  const rawSanctions = await prisma.sanction.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
          discordAvatarUrl: true,
        },
      },
      issuedBy: {
        select: {
          id: true,
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
        },
      },
      revokedBy: {
        select: {
          id: true,
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcul du statut uniforme pour chaque sanction
  const sanctionsWithStatus: SanctionRowData[] = rawSanctions.map((sanction) => {
    const isRevoked = Boolean(sanction.revokedAt);
    const isExpired = Boolean(
      !isRevoked && sanction.expiresAt && sanction.expiresAt <= now
    );
    const status: "ACTIVE" | "EXPIRED" | "REVOKED" = isRevoked
      ? "REVOKED"
      : isExpired
        ? "EXPIRED"
        : "ACTIVE";

    return {
      ...sanction,
      status,
    };
  });

  // Tri en mémoire pour garantir une cohérence totale sur toutes les colonnes
  sanctionsWithStatus.sort((a, b) => {
    let comparison = 0;

    if (sortKey === "player") {
      const nameA =
        a.user.minecraftUsername ??
        a.user.discordDisplayName ??
        a.user.discordUsername ??
        "";
      const nameB =
        b.user.minecraftUsername ??
        b.user.discordDisplayName ??
        b.user.discordUsername ??
        "";
      comparison = nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
    } else if (sortKey === "type") {
      const rank: Record<SanctionType, number> = {
        [SanctionType.EXCLUSION]: 3,
        [SanctionType.SUSPENSION]: 2,
        [SanctionType.WARNING]: 1,
      };
      comparison = rank[a.type] - rank[b.type];
    } else if (sortKey === "reason") {
      comparison = a.reason.localeCompare(b.reason, "fr", {
        sensitivity: "base",
      });
    } else if (sortKey === "status") {
      const statusRank = { ACTIVE: 3, EXPIRED: 2, REVOKED: 1 };
      comparison = statusRank[a.status] - statusRank[b.status];
    } else if (sortKey === "issuedBy") {
      const issuerA =
        a.issuedByName ??
        a.issuedBy?.minecraftUsername ??
        a.issuedBy?.discordDisplayName ??
        "";
      const issuerB =
        b.issuedByName ??
        b.issuedBy?.minecraftUsername ??
        b.issuedBy?.discordDisplayName ??
        "";
      comparison = issuerA.localeCompare(issuerB, "fr", {
        sensitivity: "base",
      });
    } else if (sortKey === "expiresAt") {
      const tA = a.expiresAt ? a.expiresAt.getTime() : null;
      const tB = b.expiresAt ? b.expiresAt.getTime() : null;
      if (tA === null && tB === null) comparison = 0;
      else if (tA === null) comparison = 1;
      else if (tB === null) comparison = -1;
      else comparison = tA - tB;
    } else {
      // Par défaut : createdAt
      comparison = a.createdAt.getTime() - b.createdAt.getTime();
    }

    return sortDir === "asc" ? comparison : -comparison;
  });

  // Pagination
  const totalCount = sanctionsWithStatus.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pageSanctions = sanctionsWithStatus.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const hasActiveFilters = Boolean(
    query ||
      (typeParam && typeParam !== "ALL") ||
      (statusParam && statusParam !== "ALL") ||
      (sourceParam && sourceParam !== "ALL")
  );

  const sortHeaderProps = {
    activeSortKey: sortKey,
    currentSort: sortDir,
    dirParamName: "dir",
    keyParamName: "sort",
    resetParamNames: ["page"],
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Sanctions
        </h1>
        <p className="text-muted-foreground text-sm">
          Gestion et historique des avertissements, suspensions et exclusions des joueurs.
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <SanctionsFilters
        query={query}
        typeFilter={typeParam}
        statusFilter={statusParam}
        sourceFilter={sourceParam}
        hasActiveSort={Boolean(rawSortKey && rawSortKey !== "createdAt")}
      />


      {/* Tableau des sanctions */}
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">
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
                  sortKey="type"
                  defaultDirection="desc"
                  label="Type"
                />
              </TableHead>
              <TableHead className="max-w-[260px]">
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="reason"
                  defaultDirection="asc"
                  label="Motif"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="status"
                  defaultDirection="desc"
                  label="Statut"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="issuedBy"
                  defaultDirection="asc"
                  label="Émetteur"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="expiresAt"
                  defaultDirection="desc"
                  label="Expiration / Fin"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="createdAt"
                  defaultDirection="desc"
                  label="Date"
                />
              </TableHead>
              <TableHead className="w-28 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageSanctions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  {hasActiveFilters
                    ? "Aucune sanction ne correspond à vos critères de recherche."
                    : "Aucune sanction enregistrée pour le moment."}
                </TableCell>
              </TableRow>
            ) : (
              pageSanctions.map((sanction) => {
                const playerName =
                  sanction.user.minecraftUsername ??
                  sanction.user.discordDisplayName ??
                  sanction.user.discordUsername ??
                  "Joueur";

                const issuerName =
                  sanction.issuedByName ??
                  sanction.issuedBy?.minecraftUsername ??
                  sanction.issuedBy?.discordDisplayName ??
                  "Staff";

                return (
                  <TableRow key={sanction.id}>
                    {/* Joueur */}
                    <TableCell className="pl-6">
                      <Link
                        href={`/staff/atlas/${sanction.userId}`}
                        className="group flex items-center gap-2.5 hover:underline"
                      >
                        <SkinHead
                          size="sm"
                          username={sanction.user.minecraftUsername ?? undefined}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{playerName}</span>
                          {sanction.user.minecraftUsername &&
                            sanction.user.discordDisplayName &&
                            sanction.user.discordDisplayName !== playerName && (
                              <span className="text-muted-foreground text-[11px]">
                                {sanction.user.discordDisplayName}
                              </span>
                            )}
                        </div>
                      </Link>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant={sanctionTypeBadgeVariant(sanction.type)}>
                        {sanctionTypeLabels[sanction.type]}
                      </Badge>
                    </TableCell>

                    {/* Raison / Motif */}
                    <TableCell className="max-w-[260px]">
                      <span
                        className="block truncate text-sm"
                        title={sanction.reason}
                      >
                        {sanction.reason}
                      </span>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant={sanctionStatusBadgeVariant(sanction.status)}
                          className="w-fit"
                        >
                          {sanction.status === "ACTIVE"
                            ? "Active"
                            : sanction.status === "EXPIRED"
                              ? "Expirée"
                              : "Levée"}
                        </Badge>
                        {sanction.status === "REVOKED" && sanction.revokedByName && (
                          <span className="text-muted-foreground text-[11px]">
                            Par {sanction.revokedByName}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Émetteur & Source */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium">{issuerName}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {sanctionSourceLabels[sanction.source]}
                        </span>
                      </div>
                    </TableCell>

                    {/* Expiration */}
                    <TableCell className="text-muted-foreground text-xs">
                      {sanction.expiresAt ? (
                        formatDate(sanction.expiresAt, {
                          style: "prefix-short",
                          withTime: true,
                        })
                      ) : sanction.type === SanctionType.EXCLUSION ? (
                        <span className="text-destructive font-medium">
                          Définitive
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Date d'émission */}
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(sanction.createdAt, {
                        style: "prefix-short",
                        withTime: true,
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <SanctionRowActions sanction={sanction} />
                    </TableCell>
                  </TableRow>
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
