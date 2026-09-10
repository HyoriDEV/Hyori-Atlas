import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerPagePrefs, checkRedirectWithSavedPrefs } from "@/lib/table-preferences";
import { getMockServerActivity, formatPlaytime } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";
import {
  characterSheetStatusBadgeVariant,
  characterStatusBadgeVariant,
  registrationStatusBadgeVariant,
} from "@/lib/atlas-status";
import { CharacterSheetStatus, CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import {
  characterSheetStatusLabels,
  characterStatusLabels,
  registrationStatusLabels,
  registrationStatusRank,
  staffNavItems,
} from "@/lib/navigation";
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
import { AtlasFilters } from "@/components/dashboard/atlas-filters";
import { AtlasTableRow } from "@/components/dashboard/atlas-table-row";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { SortHeader } from "@/components/dashboard/waitlist-sort-controls";
import { UnreadDot } from "@/components/ui/unread-dot";

const PAGE_SIZE = 10;

type SortKey =
  | "player"
  | "rpName"
  | "sheetUpdatedAt"
  | "sheetStatus"
  | "playtime"
  | "lastLogin"
  | "status";
type SortDirection = "asc" | "desc";

const VALID_SORT_KEYS: SortKey[] = [
  "player",
  "rpName",
  "sheetUpdatedAt",
  "sheetStatus",
  "playtime",
  "lastLogin",
  "status",
];

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sheetStatus?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
};

function parseEnumParam<T extends string>(
  value: string | undefined,
  enumObj: Record<string, T>
): T | null {
  if (!value) return null;
  const values = Object.values(enumObj) as string[];
  return values.includes(value) ? (value as T) : null;
}

export default async function AtlasPage(props: PageProps) {
  const item = staffNavItems.find((i) => i.href === "/staff/atlas")!;
  await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/atlas");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/atlas", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";

  const statusParam = searchParams.status;
  const statusFilter = parseEnumParam(statusParam, RegistrationStatus);

  const sheetStatusParam = searchParams.sheetStatus;
  const parsedSheetStatus = parseEnumParam(sheetStatusParam, CharacterSheetStatus);

  const rawSortKey = searchParams.sort as SortKey | undefined;
  const sortKey: SortKey | null =
    rawSortKey && VALID_SORT_KEYS.includes(rawSortKey) ? rawSortKey : null;
  const sortDir: SortDirection = searchParams.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const hasActiveFilters = Boolean(
    query ||
    (statusParam !== undefined && statusParam !== "ALL") ||
    (sheetStatusParam !== undefined && sheetStatusParam !== "ALL") ||
    sortKey !== null
  );

  const players = await prisma.user.findMany({
    where: {
      registrationStatus:
        statusFilter === RegistrationStatus.REJECTED
          ? { in: [] }
          : statusFilter
            ? statusFilter
            : { not: RegistrationStatus.REJECTED },
      ...(sheetStatusParam === "NONE"
        ? { characterSheets: { none: {} } }
        : parsedSheetStatus
          ? { characterSheets: { some: { reviewStatus: parsedSheetStatus } } }
          : {}),
      ...(query
        ? {
            OR: [
              { minecraftUsername: { contains: query, mode: "insensitive" } },
              { discordDisplayName: { contains: query, mode: "insensitive" } },
              { discordUsername: { contains: query, mode: "insensitive" } },
              {
                characterSheets: {
                  some: {
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      characterSheets: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const playersWithActivity = players.map((player) => {
    const activeSheet =
      player.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE) ??
      player.characterSheets[0] ??
      null;
    return {
      player,
      activeSheet,
      activity: getMockServerActivity(player.id, player.createdAt),
    };
  });

  if (sortKey) {
    playersWithActivity.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "player") {
        const nameA = a.player.minecraftUsername ?? a.player.discordDisplayName;
        const nameB = b.player.minecraftUsername ?? b.player.discordDisplayName;
        comparison = nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
      } else if (sortKey === "rpName") {
        const nameA = a.activeSheet?.name ?? "";
        const nameB = b.activeSheet?.name ?? "";
        if (!nameA && !nameB) comparison = 0;
        else if (!nameA) comparison = 1;
        else if (!nameB) comparison = -1;
        else comparison = nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
      } else if (sortKey === "sheetUpdatedAt") {
        const timeA = a.activeSheet?.updatedAt ? a.activeSheet.updatedAt.getTime() : null;
        const timeB = b.activeSheet?.updatedAt ? b.activeSheet.updatedAt.getTime() : null;
        if (timeA === null && timeB === null) comparison = 0;
        else if (timeA === null) return 1;
        else if (timeB === null) return -1;
        else {
          const diff = timeA - timeB;
          return sortDir === "asc" ? diff : -diff;
        }
      } else if (sortKey === "sheetStatus") {
        const rankMap: Record<CharacterSheetStatus, number> = {
          [CharacterSheetStatus.PENDING_STAFF]: 4,
          [CharacterSheetStatus.PENDING_PLAYER]: 3,
          [CharacterSheetStatus.DRAFT]: 2,
          [CharacterSheetStatus.VALIDATED]: 1,
        };
        const rankA = a.activeSheet
          ? (rankMap[a.activeSheet.reviewStatus] ?? 0)
          : 0;
        const rankB = b.activeSheet
          ? (rankMap[b.activeSheet.reviewStatus] ?? 0)
          : 0;
        comparison = rankA - rankB;
      } else if (sortKey === "playtime") {
        comparison = a.activity.totalPlaytimeMinutes - b.activity.totalPlaytimeMinutes;
      } else if (sortKey === "lastLogin") {
        const timeA = a.activity.lastLoginAt?.getTime() ?? 0;
        const timeB = b.activity.lastLoginAt?.getTime() ?? 0;
        comparison = timeA - timeB;
      } else if (sortKey === "status") {
        const rankA = registrationStatusRank[a.player.registrationStatus] ?? 0;
        const rankB = registrationStatusRank[b.player.registrationStatus] ?? 0;
        comparison = rankA - rankB;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
  }

  const totalCount = playersWithActivity.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const pagePlayers = playersWithActivity.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortHeaderProps = {
    activeSortKey: sortKey ?? undefined,
    dirParamName: "dir",
    keyParamName: "sort",
    resetParamNames: ["page"],
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Atlas des joueurs</h1>
        <AtlasFilters
          query={query}
          status={statusParam}
          sheetStatus={sheetStatusParam}
          hasActiveSort={Boolean(sortKey)}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="player"
                  defaultDirection="asc"
                  currentSort={sortDir}
                  label="Joueur"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="rpName"
                  defaultDirection="asc"
                  currentSort={sortDir}
                  label="Nom RP"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="playtime"
                  defaultDirection="desc"
                  currentSort={sortDir}
                  label="Temps de jeu"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="lastLogin"
                  defaultDirection="desc"
                  currentSort={sortDir}
                  label="Dernière connexion"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="sheetUpdatedAt"
                  defaultDirection="desc"
                  currentSort={sortDir}
                  label="Modification fiche"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="sheetStatus"
                  defaultDirection="desc"
                  currentSort={sortDir}
                  label="Fiche RP"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="status"
                  defaultDirection="asc"
                  currentSort={sortDir}
                  label="Statut d'inscription"
                />
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center text-sm">
                  {hasActiveFilters
                    ? "Aucun joueur ne correspond à ces filtres."
                    : "Aucun joueur pour l'instant."}
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map(({ player, activeSheet, activity }) => {
                const playerName = player.minecraftUsername ?? player.discordDisplayName;
                const sheet = activeSheet;
                const isPendingStaffSheet = player.characterSheets.some(
                  (s) => s.reviewStatus === CharacterSheetStatus.PENDING_STAFF
                );

                return (
                  <AtlasTableRow key={player.id} href={`/staff/atlas/${player.id}`}>
                    <TableCell className="relative pl-6">
                      {isPendingStaffSheet && (
                        <UnreadDot placement="table" title="Fiche RP en attente de relecture" />
                      )}
                      <div className="flex max-w-[180px] items-center gap-2.5" title={playerName}>
                        <SkinHead size="sm" username={player.minecraftUsername ?? undefined} />
                        <span className="truncate font-medium">{playerName}</span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-[180px] font-medium"
                      title={sheet?.name || undefined}
                    >
                      <span className="block truncate">{sheet?.name || "—"}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.lastLoginAt ? formatPlaytime(activity.totalPlaytimeMinutes) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.lastLoginAt
                        ? formatDate(activity.lastLoginAt, { style: "prefix-long", withTime: true })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet?.updatedAt
                        ? formatDate(sheet.updatedAt, { style: "prefix-long", withTime: true })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {sheet ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant={characterStatusBadgeVariant(sheet.status)} className="text-[10px] px-1.5 py-0">
                            {characterStatusLabels[sheet.status]}
                          </Badge>
                          <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)} className="text-[10px] px-1.5 py-0">
                            {characterSheetStatusLabels[sheet.reviewStatus]}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline">—</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={registrationStatusBadgeVariant(player.registrationStatus)}>
                        {registrationStatusLabels[player.registrationStatus]}
                      </Badge>
                    </TableCell>
                  </AtlasTableRow>
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
