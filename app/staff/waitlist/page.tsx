import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerPagePrefs, checkRedirectWithSavedPrefs } from "@/lib/table-preferences";
import { staffNavItems } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WaitlistRowActions } from "@/components/dashboard/waitlist-row-actions";
import { RejectedRowActions } from "@/components/dashboard/rejected-row-actions";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { SortHeader, SortToggle } from "@/components/dashboard/waitlist-sort-controls";

const PAGE_SIZE = 10;

type PageProps = {
  searchParams: Promise<{
    sort?: string;
    page?: string;
    rejectedPage?: string;
  }>;
};

export default async function WaitlistPage(props: PageProps) {
  const item = staffNavItems.find((i) => i.href === "/staff/waitlist")!;
  await requireRole(item.roles);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/waitlist");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/waitlist", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const sortOrder: "asc" | "desc" = searchParams.sort === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const rejectedPage = Math.max(1, parseInt(searchParams.rejectedPage ?? "1", 10) || 1);

  const [waitlistPlayers, rejectedPlayersAll] = await Promise.all([
    prisma.user.findMany({
      where: { registrationStatus: RegistrationStatus.WAITLIST },
      include: {
        registrationHistory: {
          where: { status: RegistrationStatus.WAITLIST },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { registrationStatus: RegistrationStatus.REJECTED },
      include: {
        registrationHistory: {
          where: { status: RegistrationStatus.WAITLIST },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const sortByWaitlistDate = <
    T extends {
      createdAt: Date;
      registrationHistory: { createdAt: Date }[];
    },
  >(
    list: T[]
  ) => {
    return list.sort((a, b) => {
      const dateA = a.registrationHistory[0]?.createdAt ?? a.createdAt;
      const dateB = b.registrationHistory[0]?.createdAt ?? b.createdAt;
      const diff = dateA.getTime() - dateB.getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
  };

  const sortedWaitlistPlayers = sortByWaitlistDate(waitlistPlayers);
  const sortedRejectedPlayers = sortByWaitlistDate(rejectedPlayersAll);

  const waitlistCount = sortedWaitlistPlayers.length;
  const rejectedCount = sortedRejectedPlayers.length;

  const waitlistTotalPages = Math.ceil(waitlistCount / PAGE_SIZE) || 1;
  const rejectedTotalPages = Math.ceil(rejectedCount / PAGE_SIZE) || 1;

  const players = sortedWaitlistPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rejectedPlayers = sortedRejectedPlayers.slice(
    (rejectedPage - 1) * PAGE_SIZE,
    rejectedPage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">
            Liste d&apos;attente{" "}
            <span className="text-muted-foreground text-base">({waitlistCount})</span>
          </h1>
          <SortToggle currentSort={sortOrder} />
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minecraft</TableHead>
                <TableHead>Discord</TableHead>
                <TableHead>
                  <SortHeader currentSort={sortOrder} label="Date d'entrée" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    Aucun joueur en attente.
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player) => {
                  const playerName = player.minecraftUsername ?? player.discordDisplayName;
                  const waitlistedDate = player.registrationHistory[0]?.createdAt;

                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        {player.minecraftUsername ? (
                          <div
                            className="flex max-w-[160px] items-center gap-2"
                            title={player.minecraftUsername}
                          >
                            <SkinHead size="sm" username={player.minecraftUsername} />
                            <span className="truncate">{player.minecraftUsername}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex max-w-[240px] items-center gap-2"
                          title={`${player.discordDisplayName} (${player.discordUsername})`}
                        >
                          <Avatar size="sm" className="shrink-0">
                            <AvatarImage
                              src={player.discordAvatarUrl ?? undefined}
                              alt={player.discordUsername}
                            />
                            <AvatarFallback>
                              {player.discordUsername.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{player.discordDisplayName}</span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            ({player.discordUsername})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(waitlistedDate, { style: "prefix-short", withTime: true })}
                      </TableCell>
                      <TableCell>
                        <WaitlistRowActions userId={player.id} pseudo={playerName} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={page}
            totalPages={waitlistTotalPages}
            totalCount={waitlistCount}
            pageSize={PAGE_SIZE}
            paramName="page"
          />
        </Card>
      </div>

      {rejectedCount > 0 && (
        <>
          <Separator />

          <div className="flex flex-col gap-6">
            <h2 className="font-heading text-2xl font-semibold">
              Liste de refus{" "}
              <span className="text-muted-foreground text-base">({rejectedCount})</span>
            </h2>

            <Card className="gap-0 overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minecraft</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead>
                      <SortHeader currentSort={sortOrder} label="Date d'entrée" />
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-10 text-center text-sm"
                      >
                        Aucun joueur refusé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rejectedPlayers.map((player) => {
                      const playerName = player.minecraftUsername ?? player.discordDisplayName;
                      const waitlistedDate = player.registrationHistory[0]?.createdAt;

                      return (
                        <TableRow key={player.id}>
                          <TableCell>
                            {player.minecraftUsername ? (
                              <div
                                className="flex max-w-[160px] items-center gap-2"
                                title={player.minecraftUsername}
                              >
                                <SkinHead size="sm" username={player.minecraftUsername} />
                                <span className="truncate">{player.minecraftUsername}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex max-w-[240px] items-center gap-2"
                              title={`${player.discordDisplayName} (${player.discordUsername})`}
                            >
                              <Avatar size="sm" className="shrink-0">
                                <AvatarImage
                                  src={player.discordAvatarUrl ?? undefined}
                                  alt={player.discordUsername}
                                />
                                <AvatarFallback>
                                  {player.discordUsername.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{player.discordDisplayName}</span>
                              <span className="text-muted-foreground shrink-0 text-xs">
                                ({player.discordUsername})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(waitlistedDate, { style: "prefix-short", withTime: true })}
                          </TableCell>
                          <TableCell>
                            <RejectedRowActions userId={player.id} pseudo={playerName} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={rejectedPage}
                totalPages={rejectedTotalPages}
                totalCount={rejectedCount}
                pageSize={PAGE_SIZE}
                paramName="rejectedPage"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
