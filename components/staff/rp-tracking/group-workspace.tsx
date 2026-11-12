"use client";

import { Users } from "@phosphor-icons/react";

import type { RpTrackingGroupDetail } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { Badge } from "@/components/ui/badge";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { sendStaffConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { MarkHandledButton } from "@/components/staff/rp-tracking/mark-handled-button";
import { EditGroupDialog } from "@/components/staff/rp-tracking/edit-group-dialog";
import { GroupMembersManager } from "@/components/staff/rp-tracking/group-members-manager";
import { GroupMembersSheet } from "@/components/staff/rp-tracking/group-members-sheet";

export function GroupWorkspace({
  group,
  availablePlayers,
  viewerId,
}: {
  group: RpTrackingGroupDetail;
  availablePlayers: PlayerOption[];
  viewerId: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      {/* En-tête du groupe */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:flex-nowrap">
        <AtlasBackButton href="/staff/rp-tracking?view=groups" className="order-1 shrink-0" />

        <div className="order-2 flex items-center gap-1.5 shrink-0 sm:order-3">
          <GroupMembersSheet
            groupId={group.id}
            members={group.members}
            availablePlayers={availablePlayers}
            className="lg:hidden"
          />
          <MarkHandledButton
            conversationId={group.conversationId}
            isHandled={!group.isPending}
            playerName={group.name}
            variant="header"
          />
          <EditGroupDialog group={group} />
        </div>

        <div className="order-3 flex min-w-0 w-full flex-1 flex-col gap-1 sm:order-2 sm:w-auto">
          <h1 className="font-heading text-lg font-semibold break-words leading-tight sm:text-xl">
            {group.name}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-foreground/80 flex items-center gap-1 font-medium">
              <Users className="text-primary size-3.5 shrink-0" />
              <span>Groupe RP</span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            {group.isPending ? (
              <Badge variant="default" className="px-1.5 py-0 text-[10px] font-normal">
                À traiter
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-muted-foreground px-1.5 py-0 text-[10px] font-normal"
              >
                Traité
              </Badge>
            )}
            {group.description && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="line-clamp-1">{group.description}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal identique aux tickets : chat à gauche, membres à droite */}
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={group.conversationId}
            initialMessages={group.messages}
            viewerId={viewerId}
            viewerIsStaff={true}
            sendAction={sendStaffConversationMessage}
            emptyBadge="Début des échanges pour ce groupe RP."
            className="min-h-0 flex-1"
          />
        </div>
        <div className="hidden min-h-0 gap-4 overflow-y-auto lg:col-span-2 lg:flex lg:flex-col">
          <GroupMembersManager
            groupId={group.id}
            members={group.members}
            availablePlayers={availablePlayers}
            className="h-auto min-h-48 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
