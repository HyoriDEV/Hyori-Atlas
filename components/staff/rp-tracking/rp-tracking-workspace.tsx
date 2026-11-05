"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowSquareOut,
  ArrowsInSimple,
  ArrowsOutSimple,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormattedDate } from "@/components/ui/formatted-date";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

/** Largeur du chat de suivi (en % de l'espace de travail, écrans larges). */
const CHAT_WIDTH_DEFAULT = 40;
const CHAT_WIDTH_MIN = 25;
const CHAT_WIDTH_MAX = 75;
const CHAT_WIDTH_STORAGE_KEY = "hyori-atlas:rp-tracking:chat-width";
const CHAT_EXPANDED_STORAGE_KEY = "hyori-atlas:rp-tracking:chat-expanded";

function clampChatWidth(value: number) {
  return Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, Math.round(value)));
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée…) : le réglage vaut pour la page seulement.
  }
}

/**
 * Largeur du chat réglable au séparateur et mode « chat agrandi » (trame masquée),
 * mémorisés par navigateur.
 */
function useChatLayout() {
  const [chatWidth, setChatWidth] = useState(CHAT_WIDTH_DEFAULT);
  const [chatExpanded, setChatExpanded] = useState(false);

  // Lu après le montage : le rendu serveur ne connaît pas le stockage du navigateur.
  useEffect(() => {
    const savedWidth = Number(readStorage(CHAT_WIDTH_STORAGE_KEY));
    if (Number.isFinite(savedWidth) && savedWidth > 0) {
      setChatWidth(clampChatWidth(savedWidth));
    }
    setChatExpanded(readStorage(CHAT_EXPANDED_STORAGE_KEY) === "1");
  }, []);

  const updateChatWidth = useCallback((value: number) => {
    const next = clampChatWidth(value);
    setChatWidth(next);
    writeStorage(CHAT_WIDTH_STORAGE_KEY, String(next));
  }, []);

  const toggleChatExpanded = useCallback(() => {
    setChatExpanded((prev) => {
      writeStorage(CHAT_EXPANDED_STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }, []);

  return { chatWidth, chatExpanded, updateChatWidth, toggleChatExpanded };
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
  const { chatWidth, chatExpanded, updateChatWidth, toggleChatExpanded } = useChatLayout();
  const workspaceRef = useRef<HTMLDivElement>(null);
  // Sous `lg`, trame et chat sont dans deux onglets au lieu d'être empilés.
  const [mobilePanel, setMobilePanel] = useState<"narration" | "suivi">("suivi");

  // Dernière modification de la trame par le joueur (chapitre le plus récemment modifié).
  const narrationUpdatedAt = chapters.reduce<number | null>((latest, chapter) => {
    const time = chapter.updatedAt ? new Date(chapter.updatedAt).getTime() : NaN;
    if (Number.isNaN(time)) return latest;
    return latest === null || time > latest ? time : latest;
  }, null);
  const [isResizing, setIsResizing] = useState(false);

  function widthFromPointer(clientX: number) {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return chatWidth;
    return ((rect.right - clientX) / rect.width) * 100;
  }

  function handleSeparatorPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }

  function handleSeparatorPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isResizing) return;
    updateChatWidth(widthFromPointer(event.clientX));
  }

  function handleSeparatorPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
  }

  function handleSeparatorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Le chat est à droite : flèche gauche = chat plus large.
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateChatWidth(chatWidth + 5);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateChatWidth(chatWidth - 5);
    }
  }

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

          {/* Dernière modification de la trame */}
          <span className="text-muted-foreground text-xs">
            {narrationUpdatedAt ? (
              <>
                Trame modifiée :{" "}
                <FormattedDate
                  date={narrationUpdatedAt}
                  style="compact"
                  withTime
                  className="text-foreground font-medium"
                />
              </>
            ) : (
              "Aucune trame"
            )}
          </span>
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

          {/* Agrandir le chat (trame masquée) */}
          <button
            type="button"
            onClick={toggleChatExpanded}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 text-xs lg:inline-flex"
            )}
            aria-pressed={chatExpanded}
          >
            {chatExpanded ? (
              <ArrowsInSimple className="size-3.5" />
            ) : (
              <ArrowsOutSimple className="size-3.5" />
            )}
            <span>{chatExpanded ? "Afficher la trame" : "Agrandir le suivi"}</span>
          </button>

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

      {/* Onglets Narration / Suivi (sous lg seulement) */}
      <Tabs
        value={mobilePanel}
        onValueChange={(value) => setMobilePanel(value as "narration" | "suivi")}
        className="shrink-0 lg:hidden"
      >
        <TabsList className="w-full">
          <TabsTrigger value="narration" className="flex-1">
            Narration RP
          </TabsTrigger>
          <TabsTrigger value="suivi" className="flex-1">
            Suivi RP
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Espace de travail principal : trame à gauche, chat de suivi à droite (largeur réglable) */}
      <div
        ref={workspaceRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-0",
          isResizing && "cursor-col-resize select-none"
        )}
        style={{ "--rp-chat-width": `${chatWidth}%` } as CSSProperties}
      >
        {/* ========================================================= */}
        {/* TRAME DE NARRATION                                         */}
        {/* ========================================================= */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            mobilePanel !== "narration" && "max-lg:hidden",
            chatExpanded && "lg:hidden"
          )}
        >
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

        {/* Séparateur glissable (écrans larges) ; double-clic = largeur par défaut */}
        {!chatExpanded && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionner le chat de suivi"
            aria-valuemin={CHAT_WIDTH_MIN}
            aria-valuemax={CHAT_WIDTH_MAX}
            aria-valuenow={chatWidth}
            tabIndex={0}
            title="Glisser pour redimensionner · double-clic pour réinitialiser"
            onPointerDown={handleSeparatorPointerDown}
            onPointerMove={handleSeparatorPointerMove}
            onPointerUp={handleSeparatorPointerUp}
            onPointerCancel={handleSeparatorPointerUp}
            onDoubleClick={() => updateChatWidth(CHAT_WIDTH_DEFAULT)}
            onKeyDown={handleSeparatorKeyDown}
            className="group relative hidden w-4 shrink-0 cursor-col-resize touch-none outline-none lg:block"
          >
            <span
              className={cn(
                "bg-border/70 group-hover:bg-primary/50 group-focus-visible:bg-primary/70 absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
                isResizing && "bg-primary/70"
              )}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* CHAT DE SUIVI RP                                           */}
        {/* ========================================================= */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:flex-1",
            mobilePanel !== "suivi" && "max-lg:hidden",
            chatExpanded ? "lg:flex-1" : "lg:w-[var(--rp-chat-width)] lg:shrink-0"
          )}
        >
          <ConversationChat
            conversationId={conversationId}
            initialMessages={initialMessages}
            viewerId={viewerId}
            viewerIsStaff
            sendAction={sendStaffConversationMessage}
            emptyBadge="Début du suivi RP."
            composerMaxHeight="40vh"
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
