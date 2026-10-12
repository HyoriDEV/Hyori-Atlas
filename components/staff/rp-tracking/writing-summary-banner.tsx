import { PenNib } from "@phosphor-icons/react/dist/ssr";

import { formatDate } from "@/lib/date";
import type { RpTrackingPlayerContext } from "@/lib/services/rp-tracking-service";
import type { ChapterItem } from "@/components/dashboard/chapter-reader";
import { WritingDrawerSheet } from "@/components/staff/rp-tracking/writing-drawer-sheet";

export function WritingSummaryBanner({
  playerId,
  playerName,
  context,
  chapters = [],
}: {
  playerId: string;
  playerName: string;
  context: RpTrackingPlayerContext;
  chapters?: ChapterItem[];
}) {
  const { character, writing, lastConnectedAt } = context;
  const hasChapters = writing.chapterCount > 0;

  return (
    <div className="border-border bg-card flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="border-border bg-muted/30 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border">
          <PenNib className="size-4.5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground truncate text-sm font-medium">
            {character ? (
              <>
                {character.name || "Nouveau personnage"}
                {character.className ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {character.className}
                  </span>
                ) : null}
              </>
            ) : (
              "Aucun personnage"
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {hasChapters ? (
              <>
                Trame : {writing.chapterCount} chapitre{writing.chapterCount > 1 ? "s" : ""} ·{" "}
                {writing.wordCount.toLocaleString("fr-FR")} mot{writing.wordCount > 1 ? "s" : ""} ·
                dernière modification :{" "}
                {formatDate(writing.lastUpdatedAt, { style: "chat" }).toLowerCase()}
              </>
            ) : (
              "Trame : aucun chapitre rédigé"
            )}
            <span className="text-border"> • </span>
            Dernière connexion :{" "}
            {formatDate(lastConnectedAt, { style: "chat", fallback: "jamais" }).toLowerCase()}
          </span>
        </div>
      </div>

      {character && hasChapters && (
        <WritingDrawerSheet
          playerId={playerId}
          playerName={playerName}
          characterName={character.name || "Personnage"}
          characterClassName={character.className}
          characterId={character.id}
          chapters={chapters}
          wordCount={writing.wordCount}
        />
      )}
    </div>
  );
}
