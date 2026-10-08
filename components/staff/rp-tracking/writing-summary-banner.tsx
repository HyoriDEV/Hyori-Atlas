import Link from "next/link";
import { ArrowRight, PenNib } from "@phosphor-icons/react/dist/ssr";

import { formatDate } from "@/lib/date";
import type { RpTrackingPlayerContext } from "@/lib/services/rp-tracking-service";
import { Button } from "@/components/ui/button";

export function WritingSummaryBanner({
  playerId,
  context,
}: {
  playerId: string;
  context: RpTrackingPlayerContext;
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
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              href={`/staff/writing/${playerId}?characterId=${character.id}&from=rp-tracking`}
              prefetch={false}
            />
          }
        >
          Lire la trame
          <ArrowRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
