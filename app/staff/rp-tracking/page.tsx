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
  DEFAULT_RP_TRACKING_VIEW,
  RP_TRACKING_ACTIVE_DAYS,
  RP_TRACKING_VIEWS,
  rpTrackingStateLabels,
  type RpTrackingState,
  type RpTrackingView,
} from "@/lib/rp-tracking";
import {
  getRpTrackingLastMessages,
  getRpTrackingPlayerContexts,
  getRpTrackingReplyStats,
  getRpTrackingStates,
} from "@/lib/services/rp-tracking-service";
import { formatDate } from "@/lib/date";
import { formatDuration } from "@/lib/text-stats";
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
import { StatTile } from "@/components/dashboard/stat-tile";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { ViewTabs } from "@/components/dashboard/view-tabs";
import { UnreadDot } from "@/components/ui/unread-dot";
import { RpTrackingSearch } from "@/components/staff/rp-tracking/rp-tracking-search";

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
  searchParams: Promise<{ q?: string; tab?: string; page?: string; pageSize?: string }>;
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
  const view: RpTrackingView = RP_TRACKING_VIEWS.includes(searchParams.tab as RpTrackingView)
    ? (searchParams.tab as RpTrackingView)
    : DEFAULT_RP_TRACKING_VIEW;

  const now = new Date();
  const activeWindowStart = new Date(now.getTime() - RP_TRACKING_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const [{ players, counts }, replyStats] = await Promise.all([
    getRpTrackingStates(),
    getRpTrackingReplyStats(activeWindowStart),
  ]);

  const normalizedQuery = query.toLocaleLowerCase("fr");
  const matchingPlayers = normalizedQuery
    ? players.filter((player) =>
        [player.minecraftUsername, player.discordDisplayName, player.discordUsername].some((name) =>
          name?.toLocaleLowerCase("fr").includes(normalizedQuery)
        )
      )
    : players;

  const countMatching = (state: RpTrackingState) =>
    matchingPlayers.filter((player) => player.state === state).length;
  const viewCounts: Record<RpTrackingView, number> = {
    all: matchingPlayers.length,
    pending: countMatching("pending"),
    recent: countMatching("recent"),
    dormant: countMatching("dormant"),
    none: countMatching("none"),
  };

  const visiblePlayers =
    view === "all" ? matchingPlayers : matchingPlayers.filter((player) => player.state === view);
  const totalCount = visiblePlayers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagePlayers = visiblePlayers.slice((page - 1) * pageSize, page * pageSize);

  const [contexts, lastMessages] = await Promise.all([
    getRpTrackingPlayerContexts(pagePlayers.map((player) => player.playerId)),
    getRpTrackingLastMessages(pagePlayers),
  ]);

  // La liste est triée : le premier suivi à traiter est celui qui attend depuis le plus longtemps.
  const longestWaiting = players.find((player) => player.state === "pending");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Suivi RP</h1>
        <RpTrackingSearch query={query} />
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          label="À traiter"
          value={counts.pending}
          hint={counts.pending > 1 ? "réponses attendues" : "réponse attendue"}
        />
        <StatTile
          label="Actifs"
          value={counts.recent}
          hint={`à jour, échange < ${RP_TRACKING_ACTIVE_DAYS} j`}
        />
        <StatTile
          label="Attente la plus longue"
          value={
            longestWaiting?.waitingSince
              ? formatDuration(now.getTime() - longestWaiting.waitingSince.getTime())
              : "—"
          }
          hint={longestWaiting ? longestWaiting.playerName : "aucun suivi en attente"}
        />
        <StatTile
          label="Délai moyen de réponse"
          value={formatDuration(replyStats.meanReplyMs)}
          hint={
            replyStats.repliesCount > 0
              ? `${replyStats.repliesCount} réponse${replyStats.repliesCount > 1 ? "s" : ""} sur ${RP_TRACKING_ACTIVE_DAYS} j`
              : `aucune réponse sur ${RP_TRACKING_ACTIVE_DAYS} j`
          }
        />
      </div>

      <ViewTabs
        activeView={view}
        defaultView={DEFAULT_RP_TRACKING_VIEW}
        tabs={[
          { value: "all", label: "Tous", count: viewCounts.all },
          { value: "pending", label: "À traiter", count: viewCounts.pending },
          { value: "recent", label: "Actifs", count: viewCounts.recent },
          { value: "dormant", label: "En sommeil", count: viewCounts.dormant },
          { value: "none", label: "Sans échange", count: viewCounts.none },
        ]}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Joueur</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Dernier message</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Trame</TableHead>
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
                  {query
                    ? "Aucun joueur ne correspond à cette recherche."
                    : view === "all"
                      ? "Aucun joueur whitelisté."
                      : "Aucun suivi dans cette vue."}
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
                      <div className="flex flex-col items-start gap-0.5">
                        <Badge
                          variant={stateBadgeVariant[player.state]}
                          className={cn(
                            "text-xs",
                            player.state === "none" && "text-muted-foreground"
                          )}
                        >
                          {rpTrackingStateLabels[player.state]}
                        </Badge>
                        {isPending && player.waitingSince && (
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            depuis {formatDuration(now.getTime() - player.waitingSince.getTime())}
                          </span>
                        )}
                      </div>
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
                      {writing && writing.chapterCount > 0
                        ? `${writing.chapterCount} chap. · ${writing.wordCount.toLocaleString("fr-FR")} mot${writing.wordCount > 1 ? "s" : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(context?.lastConnectedAt, { style: "chat", fallback: "Jamais" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(player.lastActivityAt, { style: "chat" })}
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
