"use client";

import Link from "next/link";
import {
  BookOpen,
  ArrowSquareOut,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { ChapterReader, type ChapterItem } from "@/components/dashboard/chapter-reader";
import {
  CharacterSwitcher,
  type CharacterItemSummary,
} from "@/components/player/character-switcher";
import { MarkHandledButton } from "@/components/staff/rp-tracking/mark-handled-button";
import { sendStaffConversationMessage } from "@/lib/actions/rp-tracking-actions";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";

export interface RpTrackingWorkspaceProps {
  conversationId: string;
  initialMessages: SerializedConversationMessage[];
  viewerId: string;
  player: {
    id: string;
    playerName: string;
    minecraftUsername: string | null;
    discordDisplayName: string;
    discordUsername: string;
    discordAvatarUrl: string | null;
  };
  handledState: {
    isPending: boolean;
    isHandledWithoutReply: boolean;
    lastHandledAt: string | null;
    lastHandledByName: string | null;
  };
  characters: CharacterItemSummary[];
  selectedCharacter?: { id: string } | null;
  chapters: ChapterItem[];
  canReviewSheet?: boolean;
}

export function RpTrackingWorkspace({
  conversationId,
  initialMessages,
  viewerId,
  player,
  handledState,
  characters,
  selectedCharacter,
  chapters,
}: RpTrackingWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {/* Barre supérieure unifiée */}
      <div className="border-border/70 bg-card/60 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <AtlasBackButton href="/staff/rp-tracking" />

          {/* Joueur & Avatar */}
          <Link
            href={`/staff/atlas/${player.id}`}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            title={`Consulter l'Atlas de ${player.playerName}`}
          >
            {player.minecraftUsername ? (
              <SkinHead size="sm" username={player.minecraftUsername} />
            ) : (
              <Avatar size="sm">
                <AvatarImage src={player.discordAvatarUrl ?? undefined} alt={player.playerName} />
                <AvatarFallback>{player.playerName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex flex-col">
              <span className="font-heading text-foreground truncate text-base font-semibold hover:underline">
                {player.playerName}
              </span>
              <span className="text-muted-foreground text-xs">
                {player.discordDisplayName} ({player.discordUsername})
              </span>
            </div>
          </Link>

          {/* Badge d'état de traitement */}
          <div className="flex items-center gap-2 pl-2">
            {handledState.isPending ? (
              <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs font-medium">
                <Clock className="size-3.5" />
                <span>À traiter</span>
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="gap-1 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle className="size-3.5" />
                <span>
                  {handledState.lastHandledByName
                    ? `Traité par ${handledState.lastHandledByName}`
                    : "Traité"}
                </span>
              </Badge>
            )}
          </div>
        </div>

        {/* Actions à droite */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton bascule traité */}
          <MarkHandledButton
            conversationId={conversationId}
            isHandled={!handledState.isPending}
            playerName={player.playerName}
            variant="header"
          />

          {/* Lien direct Atlas */}
          <Link
            href={`/staff/atlas/${player.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
          >
            <ArrowSquareOut className="size-3.5" />
            <span>Fiche Atlas</span>
          </Link>
        </div>
      </div>

      {/* Sélecteur de personnage si plusieurs personnages */}
      {characters.length > 1 && selectedCharacter && (
        <div className="shrink-0">
          <CharacterSwitcher characters={characters} selectedCharacterId={selectedCharacter.id} />
        </div>
      )}

      {/* Espace de travail Principal (60% Trame - 40% Chat de suivi) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-10">
        {/* ========================================================= */}
        {/* TRAME DE NARRATION (60%)                                   */}
        {/* ========================================================= */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:h-[45%] lg:col-span-6">
          {chapters.length > 0 ? (
            <ChapterReader chapters={chapters} />
          ) : (
            <Card className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="border-border bg-muted/40 flex size-12 items-center justify-center rounded-xl border">
                <BookOpen className="text-muted-foreground size-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Aucune narration rédigée</span>
                <p className="text-muted-foreground max-w-sm text-xs">
                  Ce joueur n&apos;a pas encore rédigé de chapitre de trame pour son personnage.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* ========================================================= */}
        {/* CHAT DE SUIVI RP (40%)                                     */}
        {/* ========================================================= */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:h-[55%] lg:col-span-4">
          <ConversationChat
            conversationId={conversationId}
            initialMessages={initialMessages}
            viewerId={viewerId}
            viewerIsStaff
            sendAction={sendStaffConversationMessage}
            emptyBadge="Début du suivi RP."
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
