import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Suivi RP Staff",
};
import { ConversationType, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import {
  getServerPagePrefs,
  checkRedirectWithSavedPrefs,
  resolvePageSize,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/lib/table-preferences";
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
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { UnreadDot } from "@/components/ui/unread-dot";

const DEFAULT_PAGE_SIZE = 10;

export default async function RpTrackingStaffListPage(props: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  await requireRole(rpTrackingStaffRoles);
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/rp-tracking");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/rp-tracking", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(searchParams.pageSize, savedPrefs.pageSize, DEFAULT_PAGE_SIZE);

  const players = await prisma.user.findMany({
    where: { registrationStatus: RegistrationStatus.WHITELISTED },
    include: {
      conversationMemberships: {
        where: {
          conversation: {
            type: ConversationType.RP_TRACKING,
          },
        },
        include: {
          conversation: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const sorted = players.sort((a, b) => {
    const aLast = a.conversationMemberships[0]?.conversation.messages[0]?.createdAt.getTime() ?? -1;
    const bLast = b.conversationMemberships[0]?.conversation.messages[0]?.createdAt.getTime() ?? -1;
    if (aLast !== bLast) return bLast - aLast;
    return (a.minecraftUsername ?? a.discordDisplayName).localeCompare(
      b.minecraftUsername ?? b.discordDisplayName
    );
  });

  const totalCount = sorted.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagePlayers = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">
        Suivi RP <span className="text-muted-foreground text-base">({totalCount})</span>
      </h1>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Joueur</TableHead>
              <TableHead>Dernier message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun joueur whitelisté.
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map((player) => {
                const lastMessage = player.conversationMemberships[0]?.conversation.messages[0];
                const isPendingReply = lastMessage && lastMessage.authorId === player.id;
                const playerName = player.minecraftUsername ?? player.discordDisplayName;
                return (
                  <TicketTableRow key={player.id} href={`/staff/rp-tracking/${player.id}`}>
                    <TableCell className="relative py-3 pl-6">
                      {isPendingReply && (
                        <UnreadDot placement="table" title="Réponse du staff attendue" />
                      )}
                      <Link
                        href={`/staff/atlas/${player.id}`}
                        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                        title={`Voir la fiche Atlas de ${playerName}`}
                      >
                        {player.minecraftUsername ? (
                          <SkinHead size="sm" username={player.minecraftUsername} />
                        ) : (
                          <Avatar size="sm">
                            <AvatarImage
                              src={player.discordAvatarUrl ?? undefined}
                              alt={playerName}
                            />
                            <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="font-medium hover:underline">{playerName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastMessage
                        ? formatDate(lastMessage.createdAt, {
                            style: "prefix-short",
                            withTime: true,
                          })
                        : "—"}
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
