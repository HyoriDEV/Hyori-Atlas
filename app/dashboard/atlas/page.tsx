import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getMockServerActivity, formatPlaytime } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";
import { registrationStatusBadgeVariant } from "@/lib/atlas-status";
import { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { registrationStatusLabels, staffNavItems, staffRoleLabels } from "@/lib/navigation";
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

const PAGE_SIZE = 10;

type SortKey = "pseudo" | "lastLogin" | "playtime";
type SortDirection = "asc" | "desc";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
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
  const item = staffNavItems.find((i) => i.href === "/dashboard/atlas")!;
  await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const query = searchParams.q?.trim() ?? "";
  const statusFilter = parseEnumParam(searchParams.status, RegistrationStatus);
  const roleFilter = parseEnumParam(searchParams.role, Role);
  const sortKey: SortKey =
    searchParams.sort === "lastLogin" || searchParams.sort === "playtime"
      ? searchParams.sort
      : "pseudo";
  const sortDir: SortDirection = searchParams.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const hasActiveFilters = Boolean(query || statusFilter || roleFilter);

  const players = await prisma.user.findMany({
    where: {
      ...(statusFilter ? { registrationStatus: statusFilter } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(query
        ? {
            OR: [
              { minecraftUsername: { contains: query, mode: "insensitive" } },
              { discordDisplayName: { contains: query, mode: "insensitive" } },
              { discordUsername: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const playersWithActivity = players.map((player) => ({
    player,
    activity: getMockServerActivity(player.id, player.createdAt),
  }));

  playersWithActivity.sort((a, b) => {
    let comparison = 0;
    if (sortKey === "pseudo") {
      const nameA = a.player.minecraftUsername ?? a.player.discordDisplayName;
      const nameB = b.player.minecraftUsername ?? b.player.discordDisplayName;
      comparison = nameA.localeCompare(nameB, "fr");
    } else if (sortKey === "lastLogin") {
      comparison =
        (a.activity.lastLoginAt?.getTime() ?? 0) - (b.activity.lastLoginAt?.getTime() ?? 0);
    } else {
      comparison = a.activity.totalPlaytimeMinutes - b.activity.totalPlaytimeMinutes;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  const totalCount = playersWithActivity.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const pagePlayers = playersWithActivity.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortHeaderProps = {
    activeSortKey: sortKey,
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
          status={searchParams.status ?? "ALL"}
          role={searchParams.role ?? "ALL"}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="pseudo"
                  currentSort={sortDir}
                  label="Joueur"
                />
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="lastLogin"
                  currentSort={sortDir}
                  label="Dernière connexion"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  {...sortHeaderProps}
                  sortKey="playtime"
                  currentSort={sortDir}
                  label="Temps de jeu"
                />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">
                  {hasActiveFilters
                    ? "Aucun joueur ne correspond à ces filtres."
                    : "Aucun joueur pour l'instant."}
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map(({ player, activity }) => {
                const playerName = player.minecraftUsername ?? player.discordDisplayName;

                return (
                  <AtlasTableRow key={player.id} href={`/dashboard/atlas/${player.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <SkinHead size="sm" username={player.minecraftUsername ?? undefined} />
                        <div className="flex flex-col">
                          <span className="font-medium">{playerName}</span>
                          <span className="text-muted-foreground text-xs">
                            {staffRoleLabels[player.role]}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={registrationStatusBadgeVariant(player.registrationStatus)}>
                        {registrationStatusLabels[player.registrationStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(activity.lastLoginAt, { style: "prefix-short", withTime: true })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.lastLoginAt ? formatPlaytime(activity.totalPlaytimeMinutes) : "—"}
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
