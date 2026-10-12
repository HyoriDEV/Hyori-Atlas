import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Suivi RP Staff",
};
import { rpTrackingStaffRoles } from "@/lib/navigation";
import {
  DEFAULT_RP_TRACKING_FILTER_STATUS,
  DEFAULT_RP_TRACKING_WRITING_FILTER,
  RP_TRACKING_FILTER_STATUSES,
  RP_TRACKING_WRITING_FILTERS,
  rpTrackingStateLabels,
  type RpTrackingFilterStatus,
  type RpTrackingState,
  type RpTrackingWritingFilter,
} from "@/lib/rp-tracking";
import {
  getRpTrackingLastMessages,
  getRpTrackingPlayerContexts,
  getRpTrackingStates,
} from "@/lib/services/rp-tracking-service";
import { formatDate } from "@/lib/date";
import { cn, truncate } from "@/lib/utils";
import {
  getServerPagePrefs,
  checkRedirectWithSavedPrefs,
  resolvePageSize,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/lib/table-preferences";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { RpHubHeader } from "@/components/staff/rp-hub/rp-hub-header";
import { RpTrackingFilters } from "@/components/staff/rp-tracking/rp-tracking-filters";

const DEFAULT_PAGE_SIZE = 10;
const LAST_MESSAGE_PREVIEW_LENGTH = 90;
const COLUMN_COUNT = 7;

const stateBadgeVariant: Record<RpTrackingState, "default" | "secondary" | "outline"> = {
  pending: "default",
  recent: "secondary",
  dormant: "outline",
  none: "outline",
};

export default async function RpTrackingStaffListPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    writing?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staffUser = await requireRole(rpTrackingStaffRoles);
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/rp-tracking");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/rp-tracking", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(searchParams.pageSize, savedPrefs.pageSize, DEFAULT_PAGE_SIZE);

  const statusFilter: RpTrackingFilterStatus = RP_TRACKING_FILTER_STATUSES.includes(
    searchParams.status as RpTrackingFilterStatus
  )
    ? (searchParams.status as RpTrackingFilterStatus)
    : RP_TRACKING_FILTER_STATUSES.includes(savedPrefs.status as RpTrackingFilterStatus)
      ? (savedPrefs.status as RpTrackingFilterStatus)
      : DEFAULT_RP_TRACKING_FILTER_STATUS;

  const writingFilter: RpTrackingWritingFilter = RP_TRACKING_WRITING_FILTERS.includes(
    searchParams.writing as RpTrackingWritingFilter
  )
    ? (searchParams.writing as RpTrackingWritingFilter)
    : RP_TRACKING_WRITING_FILTERS.includes(savedPrefs.writing as RpTrackingWritingFilter)
      ? (savedPrefs.writing as RpTrackingWritingFilter)
      : DEFAULT_RP_TRACKING_WRITING_FILTER;

  const { players, counts, totalWithWriting } = await getRpTrackingStates();

  const normalizedQuery = query.toLocaleLowerCase("fr");
  let filteredPlayers = players;

  // Filtrage textuel
  if (normalizedQuery) {
    filteredPlayers = filteredPlayers.filter((player) =>
      [player.minecraftUsername, player.discordDisplayName, player.discordUsername].some((name) =>
        name?.toLocaleLowerCase("fr").includes(normalizedQuery)
      )
    );
  }

  // Filtrage par état
  if (statusFilter === "ongoing") {
    filteredPlayers = filteredPlayers.filter(
      (player) => player.state === "pending" || player.state === "recent"
    );
  } else if (statusFilter !== "all") {
    filteredPlayers = filteredPlayers.filter((player) => player.state === statusFilter);
  }

  // Filtrage par présence de trame
  if (writingFilter === "has_writing") {
    filteredPlayers = filteredPlayers.filter((player) => player.hasWriting);
  } else if (writingFilter === "no_writing") {
    filteredPlayers = filteredPlayers.filter((player) => !player.hasWriting);
  }

  const totalCount = filteredPlayers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagePlayers = filteredPlayers.slice((page - 1) * pageSize, page * pageSize);

  const [contexts, lastMessages] = await Promise.all([
    getRpTrackingPlayerContexts(pagePlayers.map((player) => player.playerId)),
    getRpTrackingLastMessages(pagePlayers),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RpHubHeader
        activeTab="messaging"
        pendingMessagesCount={counts.pending}
        totalStoriesCount={totalWithWriting}
      />

      <RpTrackingFilters
        query={query}
        status={statusFilter}
        writing={writingFilter}
        counts={counts}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Joueur</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Dernier message</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Trame écrite</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>Dernière activité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  {query ||
                  statusFilter !== DEFAULT_RP_TRACKING_FILTER_STATUS ||
                  writingFilter !== DEFAULT_RP_TRACKING_WRITING_FILTER
                    ? "Aucun joueur ne correspond aux filtres sélectionnés."
                    : "Aucun suivi en cours actuellement."}
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map((player) => {
                const context = contexts.get(player.playerId);
                const lastMessage = player.conversationId
                  ? lastMessages.get(player.conversationId)
                  : undefined;
                const isPending = player.state === "pending";
                const lastMessageAuthor = lastMessage
                  ? lastMessage.authorId === staffUser.id
                    ? "Moi"
                    : (lastMessage.authorName ?? "Inconnu")
                  : null;
                const lastMessageText = lastMessage
                  ? lastMessage.body
                    ? truncate(lastMessage.body.replace(/\s+/g, " "), LAST_MESSAGE_PREVIEW_LENGTH)
                    : lastMessage.hasImage
                      ? "Image"
                      : ""
                  : null;
                const writing = context?.writing;

                return (
                  <TicketTableRow
                    key={player.playerId}
                    href={`/staff/rp-tracking/${player.playerId}`}
                  >
                    <TableCell className="relative py-3 pl-6">
                      {isPending && (
                        <UnreadDot placement="table" title="Réponse du staff attendue" />
                      )}
                      <Link
                        href={`/staff/atlas/${player.playerId}`}
                        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                        title={`Voir la fiche Atlas de ${player.playerName}`}
                      >
                        {player.minecraftUsername ? (
                          <SkinHead size="sm" username={player.minecraftUsername} />
                        ) : (
                          <Avatar size="sm">
                            <AvatarImage
                              src={player.discordAvatarUrl ?? undefined}
                              alt={player.playerName}
                            />
                            <AvatarFallback>
                              {player.playerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span
                            className={cn(
                              "hover:underline",
                              isPending ? "font-semibold" : "font-medium"
                            )}
                          >
                            {player.playerName}
                          </span>
                          {context?.character && (
                            <span className="text-muted-foreground truncate text-xs">
                              {context.character.name}
                              {context.character.className
                                ? ` · ${context.character.className}`
                                : ""}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={stateBadgeVariant[player.state]}
                        className={cn(
                          "text-xs",
                          player.state === "none" && "text-muted-foreground"
                        )}
                      >
                        {rpTrackingStateLabels[player.state]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {lastMessage ? (
                        <span
                          className={cn(
                            "block truncate text-sm",
                            isPending ? "text-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {lastMessageAuthor} : {lastMessageText}
                        </span>
                      ) : player.state === "none" ? (
                        <span className="text-muted-foreground/60 text-xs italic">
                          Suivi non démarré
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ChatCircle className="size-3.5" />
                        {player.messageCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {writing && writing.chapterCount > 0 ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {writing.chapterCount} chap. · {writing.wordCount.toLocaleString("fr-FR")}{" "}
                          mot{writing.wordCount > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">Aucune trame</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(context?.lastConnectedAt, { style: "chat", fallback: "Jamais" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(player.lastActivityAt, { style: "chat", fallback: "—" })}
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
