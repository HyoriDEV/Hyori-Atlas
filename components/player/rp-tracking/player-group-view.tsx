"use client";

import { Users } from "@phosphor-icons/react";

import type { RpTrackingGroupDetail } from "@/lib/services/group-rp-tracking-service";
import { Badge } from "@/components/ui/badge";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { sendConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { GroupMembersManager } from "@/components/staff/rp-tracking/group-members-manager";
import { GroupMembersSheet } from "@/components/staff/rp-tracking/group-members-sheet";

export function PlayerGroupView({
  group,
  viewerId,
}: {
  group: RpTrackingGroupDetail;
  viewerId: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      {/* En-tête du groupe */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="text-foreground/80 flex items-center gap-1 font-medium">
              <Users className="text-primary size-3.5" />
              <span>Groupe RP</span>
            </span>
            <span>·</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
            </Badge>
          </span>
          <h2 className="font-heading text-lg font-semibold break-words">{group.name}</h2>
          {group.description && (
            <p className="text-muted-foreground text-xs">{group.description}</p>
          )}
        </div>

        <GroupMembersSheet
          groupId={group.id}
          members={group.members}
          readOnly
          className="lg:hidden"
        />
      </div>

      {/* Contenu principal identique aux tickets : chat à gauche, membres à droite */}
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-7">
        <div className="flex min-h-0 flex-1 flex-col lg:col-span-5">
          <ConversationChat
            conversationId={group.conversationId}
            initialMessages={group.messages}
            viewerId={viewerId}
            viewerIsStaff={false}
            sendAction={sendConversationMessage}
            emptyBadge="Début des échanges dans ce groupe RP."
            className="min-h-0 flex-1"
          />
        </div>
        <div className="hidden min-h-0 lg:col-span-2 lg:flex lg:flex-col">
          <GroupMembersManager
            groupId={group.id}
            members={group.members}
            readOnly
            className="h-auto min-h-48 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
