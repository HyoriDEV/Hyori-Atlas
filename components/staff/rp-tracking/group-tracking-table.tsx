"use client";

import { ChatCircle } from "@phosphor-icons/react";

import { cn, truncate } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/lib/table-preferences";
import type { RpTrackingGroupSummary } from "@/lib/services/group-rp-tracking-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";
import { UnreadDot } from "@/components/ui/unread-dot";
import { GroupRowActions } from "@/components/staff/rp-tracking/group-row-actions";
import { MarkHandledButton } from "@/components/staff/rp-tracking/mark-handled-button";

const LAST_MESSAGE_PREVIEW_LENGTH = 52;
const COLUMN_COUNT = 7;

export interface GroupTrackingTableProps {
  groups: RpTrackingGroupSummary[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  activeTab?: string;
  tab?: string;
  query?: string;
  currentUserId?: string;
  currentStaffId?: string;
}

export function GroupTrackingTable({
  groups,
  totalCount = groups.length,
  totalPages = 1,
  currentPage = 1,
  pageSize = 10,
  activeTab,
  tab,
  query = "",
  currentUserId,
  currentStaffId,
}: GroupTrackingTableProps) {
  const currentTab = activeTab ?? tab ?? "pending";
  const staffId = currentUserId ?? currentStaffId ?? "";
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Groupe RP</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="hidden md:table-cell">Dernier message</TableHead>
            <TableHead className="hidden lg:table-cell">Membres</TableHead>
            <TableHead className="hidden lg:table-cell">Messages</TableHead>
            <TableHead className="hidden md:table-cell">Dernière activité</TableHead>
            <TableHead className="w-12 pr-6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="text-muted-foreground py-10 text-center text-sm"
              >
                {query
                  ? "Aucun groupe ne correspond à votre recherche."
                  : currentTab === "pending"
                    ? "Aucun suivi de groupe à traiter actuellement."
                    : currentTab === "handled"
                      ? "Aucun suivi de groupe traité."
                      : "Aucun groupe de suivi RP."}
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => {
              const lastMessage = group.lastMessage;
              const isPending = group.isPending;
              const lastMessageAuthor = lastMessage
                ? lastMessage.authorId === staffId
                  ? "Moi"
                  : (lastMessage.authorName ?? "Inconnu")
                : null;
              const lastMessageText = lastMessage
                ? lastMessage.body
                  ? truncate(
                      lastMessage.body.replace(/\s+/g, " "),
                      LAST_MESSAGE_PREVIEW_LENGTH,
                      "..."
                    )
                  : lastMessage.hasImage
                    ? "Image"
                    : ""
                : null;

              return (
                <TicketTableRow key={group.id} href={`/staff/rp-tracking/groups/${group.id}`}>
                  <TableCell className="relative py-3 pl-6">
                    {isPending && <UnreadDot placement="table" title="Réponse du staff attendue" />}
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-heading hover:underline",
                          isPending
                            ? "text-foreground font-semibold"
                            : "text-foreground font-medium"
                        )}
                      >
                        {group.name}
                      </span>
                      {group.description && (
                        <span className="text-muted-foreground line-clamp-1 text-xs">
                          {group.description}
                        </span>
                      )}
                      <span className="text-muted-foreground text-[11px]">
                        Créé le {formatDate(group.createdAt)}
                        {group.createdByName && ` par ${group.createdByName}`}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {group.isPending ? (
                      <Badge variant="default" className="text-xs">
                        À traiter
                      </Badge>
                    ) : group.isHandledWithoutReply ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="secondary" className="w-fit text-xs font-medium">
                          Traité
                        </Badge>
                        {group.lastHandledByName && (
                          <span className="text-muted-foreground text-[10px]">
                            par {group.lastHandledByName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground text-xs font-normal"
                      >
                        Traité
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="hidden max-w-md md:table-cell">
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
                      <span className="text-muted-foreground/60 text-xs italic">Aucun message</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {group.members.length === 0 ? (
                      <span className="text-muted-foreground/60 text-xs italic">Aucun membre</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5 overflow-hidden py-1">
                          {group.members.slice(0, 4).map((member) => (
                            <div
                              key={member.userId}
                              className="ring-background relative inline-block rounded-full ring-2"
                              title={`${member.playerName}${member.character ? ` (${member.character.name})` : ""}`}
                            >
                              {member.minecraftUsername ? (
                                <SkinHead size="sm" username={member.minecraftUsername} />
                              ) : (
                                <Avatar size="sm">
                                  <AvatarImage
                                    src={member.discordAvatarUrl ?? undefined}
                                    alt={member.playerName}
                                  />
                                  <AvatarFallback>
                                    {member.playerName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {group.members.length} {group.members.length > 1 ? "membres" : "membre"}
                          {group.members.length > 4 ? ` (+${group.members.length - 4})` : ""}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      <ChatCircle className="size-3.5" />
                      {group.messageCount}
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden whitespace-nowrap md:table-cell">
                    {formatDate(group.lastActivityAt, { style: "chat", fallback: "—" })}
                  </TableCell>

                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {group.conversationId && (group.isPending || group.isHandledWithoutReply) ? (
                        <MarkHandledButton
                          conversationId={group.conversationId}
                          isHandled={group.isHandledWithoutReply}
                          playerName={group.name}
                        />
                      ) : null}
                      <GroupRowActions group={group} />
                    </div>
                  </TableCell>
                </TicketTableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        paramName="page"
        sizeParamName="pageSize"
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
      />
    </Card>
  );
}
