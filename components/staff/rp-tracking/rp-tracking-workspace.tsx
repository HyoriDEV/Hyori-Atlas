"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChatCircle,
  BookOpen,
  IdentificationCard,
  Columns,
  SquareSplitHorizontal,
  ArrowSquareOut,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { ChapterReader, type ChapterItem } from "@/components/dashboard/chapter-reader";
import type { ComponentProps } from "react";
import { ChapterSelect } from "@/components/dashboard/chapter-select";
import {
  CharacterSwitcher,
  type CharacterItemSummary,
} from "@/components/player/character-switcher";
import { AtlasCharacterSheetSummary } from "@/components/dashboard/atlas-character-sheet-summary";
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
  selectedCharacter: ComponentProps<typeof AtlasCharacterSheetSummary>["sheet"];
  chapters: ChapterItem[];
  canReviewSheet: boolean;
}

const SPLIT_VIEW_STORAGE_KEY = "hyori_rp_tracking_split_view";

export function RpTrackingWorkspace({
  conversationId,
  initialMessages,
  viewerId,
  player,
  handledState,
  characters,
  selectedCharacter,
  chapters,
  canReviewSheet,
}: RpTrackingWorkspaceProps) {
  const [splitView, setSplitView] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(SPLIT_VIEW_STORAGE_KEY);
        if (saved !== null) {
          return saved === "true";
        }
      } catch {
        // Ignorer les erreurs d'accès à localStorage
      }
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState<"chat" | "writing" | "sheet">("chat");
  const [companionTab, setCompanionTab] = useState<"writing" | "sheet">("writing");

  const handleToggleSplitView = () => {
    const next = !splitView;
    setSplitView(next);
    try {
      localStorage.setItem(SPLIT_VIEW_STORAGE_KEY, String(next));
    } catch {}
  };

  const wordCount = chapters.reduce((sum, ch) => {
    const words = ch.content
      .replace(/<[^>]*>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return sum + words;
  }, 0);

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

          {/* Bascule Vue Scindée sur grand écran */}
          <Button
            variant={splitView ? "secondary" : "ghost"}
            size="sm"
            onClick={handleToggleSplitView}
            className="hidden items-center gap-1.5 text-xs lg:inline-flex"
            title={
              splitView
                ? "Désactiver la vue scindée (onglets simples)"
                : "Activer la vue scindée (lore + chat en parallèle)"
            }
          >
            {splitView ? (
              <>
                <SquareSplitHorizontal className="text-primary size-4" />
                <span>Vue scindée</span>
              </>
            ) : (
              <>
                <Columns className="size-4" />
                <span>Vue simple</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sélecteur de personnage si plusieurs personnages */}
      {characters.length > 1 && selectedCharacter && (
        <div className="shrink-0">
          <CharacterSwitcher characters={characters} selectedCharacterId={selectedCharacter.id} />
        </div>
      )}

      {/* Barre de navigation par onglets pour la vue simple ou petit écran */}
      <div className={cn("shrink-0", splitView && "lg:hidden")}>
        <div className="bg-muted inline-flex w-full items-center justify-start gap-1 rounded-lg p-1 text-sm sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "chat"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChatCircle className="size-4" />
            <span>Suivi RP</span>
            {handledState.isPending && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                !
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("writing")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "writing"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="size-4" />
            <span>Narration & Trames</span>
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              {chapters.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sheet")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "sheet"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <IdentificationCard className="size-4" />
            <span>Fiche RP</span>
          </button>
        </div>
      </div>

      {/* Espace de travail Principal */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* ========================================================= */}
        {/* MODE VUE SCINDÉE (DESKTOP)                                */}
        {/* ========================================================= */}
        {splitView && (
          <div className="hidden min-h-0 w-1/2 flex-col gap-3 lg:flex">
            {/* Header du panneau d'accompagnement */}
            <div className="border-border/70 bg-card/60 flex shrink-0 items-center justify-between rounded-xl border px-3 py-2 shadow-xs">
              <div className="bg-muted inline-flex items-center rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCompanionTab("writing")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    companionTab === "writing"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BookOpen className="size-3.5" />
                  <span>Narration ({chapters.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanionTab("sheet")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    companionTab === "sheet"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IdentificationCard className="size-3.5" />
                  <span>Fiche RP</span>
                </button>
              </div>

              {companionTab === "writing" && chapters.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {wordCount.toLocaleString("fr-FR")} mots
                  </span>
                  <ChapterSelect chapters={chapters} />
                </div>
              )}
            </div>

            {/* Contenu du panneau d'accompagnement */}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {companionTab === "writing" ? (
                chapters.length > 0 ? (
                  <Card className="min-h-full p-4">
                    <ChapterReader chapters={chapters} />
                  </Card>
                ) : (
                  <Card className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="border-border bg-muted/40 flex size-12 items-center justify-center rounded-xl border">
                      <BookOpen className="text-muted-foreground size-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">Aucune narration rédigée</span>
                      <p className="text-muted-foreground max-w-sm text-xs">
                        Ce joueur n&apos;a pas encore rédigé de chapitre de trame pour son
                        personnage.
                      </p>
                    </div>
                  </Card>
                )
              ) : selectedCharacter ? (
                <AtlasCharacterSheetSummary
                  sheet={selectedCharacter}
                  playerId={player.id}
                  pseudo={player.playerName}
                  canReview={canReviewSheet}
                />
              ) : (
                <Card className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <span className="text-muted-foreground text-xs">Aucune fiche de personnage</span>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PANNEAU DE CHAT (TOUJOURS AFFICHÉ EN SPLIT, OU SELON TAB) */}
        {/* ========================================================= */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !splitView && activeTab !== "chat" && "hidden lg:hidden"
          )}
        >
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

        {/* ========================================================= */}
        {/* VUE UNIQUE NARRATION (QUAND SPLIT = FALSE & TAB = WRITING) */}
        {/* ========================================================= */}
        {!splitView && activeTab === "writing" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {chapters.length > 0 ? (
              <Card className="min-h-full p-6">
                <div className="mb-4 flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Trame de narration</span>
                    <Badge variant="outline" className="text-xs">
                      {chapters.length} chapitres · {wordCount.toLocaleString("fr-FR")} mots
                    </Badge>
                  </div>
                  <ChapterSelect chapters={chapters} />
                </div>
                <ChapterReader chapters={chapters} />
              </Card>
            ) : (
              <Card className="flex h-full flex-col items-center justify-center gap-3 p-12 text-center">
                <BookOpen className="text-muted-foreground size-8" />
                <span className="text-sm font-semibold">Aucune narration rédigée</span>
                <p className="text-muted-foreground text-xs">
                  Ce joueur n&apos;a pas encore rédigé de chapitre pour ce personnage.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VUE UNIQUE FICHE RP (QUAND SPLIT = FALSE & TAB = SHEET)   */}
        {/* ========================================================= */}
        {!splitView && activeTab === "sheet" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {selectedCharacter ? (
              <AtlasCharacterSheetSummary
                sheet={selectedCharacter}
                playerId={player.id}
                pseudo={player.playerName}
                canReview={canReviewSheet}
              />
            ) : (
              <Card className="flex h-full flex-col items-center justify-center p-8 text-center">
                <span className="text-muted-foreground text-xs">Aucune fiche de personnage</span>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
