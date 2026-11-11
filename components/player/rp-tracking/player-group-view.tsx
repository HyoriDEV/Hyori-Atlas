"use client";

import { useState } from "react";
import { ChatCircle, BookOpen, Users } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { RpTrackingGroupDetail } from "@/lib/services/group-rp-tracking-service";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { ChapterReader } from "@/components/dashboard/chapter-reader";
import { sendConversationMessage } from "@/lib/actions/rp-tracking-actions";

export function PlayerGroupView({
  group,
  viewerId,
  initialTab = "chat",
}: {
  group: RpTrackingGroupDetail;
  viewerId: string;
  initialTab?: "chat" | "narration";
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "narration">(initialTab);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {/* En-tête et membres du groupe */}
      <div className="bg-card/60 flex flex-col gap-2 rounded-lg border p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Users className="text-primary size-5" />
              <h2 className="font-heading text-lg font-bold">{group.name}</h2>
              <Badge variant="outline" className="text-xs">
                Groupe RP ({group.memberCount} membres)
              </Badge>
            </div>
            {group.description && (
              <p className="text-muted-foreground text-xs">{group.description}</p>
            )}
          </div>

          {/* Onglets Conversation / Narration */}
          <div className="bg-muted inline-flex items-center rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ChatCircle className="size-3.5" />
              <span>Conversation</span>
            </button>
            <button
              onClick={() => setActiveTab("narration")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                activeTab === "narration"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="size-3.5" />
              <span>Narration ({group.chapterCount} chap.)</span>
            </button>
          </div>
        </div>

        {/* Liste des membres */}
        <div className="border-border flex flex-wrap items-center gap-2 border-t pt-2.5">
          <span className="text-muted-foreground text-[11px] font-medium">Membres :</span>
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="bg-background border-border inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-xs"
              title={`${member.playerName}${member.character ? ` (${member.character.name})` : ""}`}
            >
              <SkinHead
                username={member.minecraftUsername}
                avatarUrl={member.discordAvatarUrl}
                size="sm"
              />
              <span className="font-medium">{member.playerName}</span>
              {member.character && (
                <span className="text-muted-foreground text-[10px]">· {member.character.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenu : Conversation ou Narration */}
      <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-lg border">
        {activeTab === "chat" ? (
          <ConversationChat
            conversationId={group.conversationId}
            initialMessages={group.messages}
            viewerId={viewerId}
            viewerIsStaff={false}
            sendAction={sendConversationMessage}
            emptyBadge="Début des échanges dans ce groupe RP."
            className="min-h-0 flex-1"
          />
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            {group.chapters.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm">
                <BookOpen className="size-10 opacity-40" />
                <p>Aucun chapitre de narration n&apos;a encore été publié pour ce groupe.</p>
                <p className="text-xs">
                  Le staff publiera ici les récits et trames de votre groupe.
                </p>
              </div>
            ) : (
              <ChapterReader chapters={group.chapters} className="min-h-0 flex-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
