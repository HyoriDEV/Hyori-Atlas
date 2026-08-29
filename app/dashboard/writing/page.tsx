import Link from "next/link";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { writingReviewerRoles } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
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

const PAGE_SIZE = 10;

export default async function WritingStaffListPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(writingReviewerRoles);
  const searchParams = await props.searchParams;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const players = await prisma.user.findMany({
    where: { registrationStatus: RegistrationStatus.WHITELISTED },
    include: {
      chapters: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      _count: { select: { chapters: true } },
    },
  });

  const sorted = players.sort((a, b) => {
    const aLast = a.chapters[0]?.updatedAt.getTime() ?? -1;
    const bLast = b.chapters[0]?.updatedAt.getTime() ?? -1;
    if (aLast !== bLast) return bLast - aLast;
    return (a.minecraftUsername ?? a.discordDisplayName).localeCompare(
      b.minecraftUsername ?? b.discordDisplayName
    );
  });

  const totalCount = sorted.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const pagePlayers = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">
        Écriture <span className="text-muted-foreground text-base">({totalCount})</span>
      </h1>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Chapitres</TableHead>
              <TableHead>Dernière modification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun joueur whitelisté.
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map((player) => {
                const lastChapter = player.chapters[0];
                return (
                  <TableRow key={player.id}>
                    <TableCell className="p-0">
                      <Link
                        href={`/dashboard/writing/${player.id}`}
                        className="flex items-center gap-2 px-4 py-3"
                      >
                        {player.minecraftUsername ? (
                          <SkinHead size="sm" username={player.minecraftUsername} />
                        ) : (
                          <Avatar size="sm">
                            <AvatarImage
                              src={player.discordAvatarUrl ?? undefined}
                              alt={player.discordDisplayName}
                            />
                            <AvatarFallback>
                              {player.discordDisplayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span>{player.minecraftUsername ?? player.discordDisplayName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {player._count.chapters}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastChapter
                        ? formatDate(lastChapter.updatedAt, {
                            style: "prefix-short",
                            withTime: true,
                          })
                        : "—"}
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
          pageSize={PAGE_SIZE}
          paramName="page"
        />
      </Card>
    </div>
  );
}
