"use client";

import { useState } from "react";
import { BookOpen, ChatCircle, Columns, Users } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { RpTrackingGroupDetail } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { Badge } from "@/components/ui/badge";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { sendStaffConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { MarkHandledButton } from "@/components/staff/rp-tracking/mark-handled-button";
import { EditGroupDialog } from "@/components/staff/rp-tracking/edit-group-dialog";
import { GroupMembersManager } from "@/components/staff/rp-tracking/group-members-manager";
import { GroupChapterWorkspace } from "@/components/staff/rp-tracking/group-chapter-workspace";

export function GroupWorkspace({
  group,
  availablePlayers,
  viewerId,
}: {
  group: RpTrackingGroupDetail;
  availablePlayers: PlayerOption[];
  viewerId: string;
}) {
  const [activeTab, setActiveTab] = useState<"split" | "narration" | "chat">("split");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {/* En-tête du groupe */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AtlasBackButton href="/staff/rp-tracking?view=groups" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Users className="text-primary size-5" />
              <h1 className="font-heading text-xl font-bold">{group.name}</h1>
              {group.isPending ? (
                <Badge variant="default" className="text-xs">
                  À traiter
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground text-xs font-normal">
                  Traité
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-muted-foreground text-xs">{group.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Marquer traité */}
          <MarkHandledButton
            conversationId={group.conversationId}
            isHandled={!group.isPending}
            playerName={group.name}
            variant="header"
          />

          {/* Modifier le groupe */}
          <EditGroupDialog group={group} />

          {/* Sélecteur de disposition */}
          <div className="bg-muted hidden items-center rounded-lg p-0.5 md:flex">
            <button
              onClick={() => setActiveTab("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "split"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Côte à côte"
            >
              <Columns className="size-3.5" />
              <span>Duo</span>
            </button>
            <button
              onClick={() => setActiveTab("narration")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "narration"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Narration seule"
            >
              <BookOpen className="size-3.5" />
              <span>Narration</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Conversation seule"
            >
              <ChatCircle className="size-3.5" />
              <span>Échanges</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gestion des membres du groupe */}
      <GroupMembersManager
        groupId={group.id}
        members={group.members}
        availablePlayers={availablePlayers}
      />

      {/* Contenu principal : Split ou Onglets */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {activeTab === "split" ? (
          <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-12">
            {/* Colonne Narration (7 cols) */}
            <div className="border-border col-span-12 flex min-h-0 flex-col border-b md:col-span-7 md:border-r md:border-b-0">
              <GroupChapterWorkspace groupId={group.id} initialChapters={group.chapters} />
            </div>

            {/* Colonne Conversation (5 cols) */}
            <div className="col-span-12 flex min-h-0 flex-col md:col-span-5">
              <div className="border-border bg-card/60 flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
                <ChatCircle className="text-primary size-4" />
                <h3 className="font-heading text-sm font-semibold">Échanges du groupe</h3>
              </div>
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
          </div>
        ) : activeTab === "narration" ? (
          <GroupChapterWorkspace groupId={group.id} initialChapters={group.chapters} />
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-border bg-card/60 flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
              <ChatCircle className="text-primary size-4" />
              <h3 className="font-heading text-sm font-semibold">Échanges du groupe</h3>
            </div>
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
        )}
      </div>
    </div>
  );
}
