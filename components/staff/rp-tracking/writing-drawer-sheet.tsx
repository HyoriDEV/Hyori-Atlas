"use client";

import Link from "next/link";
import { ArrowsOutSimple, BookOpen } from "@phosphor-icons/react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChapterReader, type ChapterItem } from "@/components/dashboard/chapter-reader";
import { ChapterSelect } from "@/components/dashboard/chapter-select";

export interface WritingDrawerSheetProps {
  playerId: string;
  playerName: string;
  characterName: string;
  characterClassName: string | null;
  characterId: string;
  chapters: ChapterItem[];
  wordCount: number;
}

export function WritingDrawerSheet({
  playerId,
  playerName,
  characterName,
  characterClassName,
  characterId,
  chapters,
  wordCount,
}: WritingDrawerSheetProps) {
  if (chapters.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-2 opacity-60">
        <BookOpen className="size-3.5" />
        Aucune trame rédigée
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            <BookOpen className="size-3.5" />
            Consulter la trame ({chapters.length})
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="border-border flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex min-w-0 flex-col gap-1 pr-8">
            <SheetTitle className="truncate text-base font-semibold">
              Trame de {characterName}
              <span className="text-muted-foreground font-normal"> ({playerName})</span>
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {characterClassName && (
                <Badge variant="secondary" className="text-xs">
                  {characterClassName}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {chapters.length} chapitre{chapters.length > 1 ? "s" : ""} ·{" "}
                {wordCount.toLocaleString("fr-FR")} mot{wordCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <ChapterSelect chapters={chapters} />
            <Button
              size="sm"
              variant="ghost"
              render={
                <Link
                  href={`/staff/writing/${playerId}?characterId=${characterId}&from=rp-tracking`}
                  prefetch={false}
                  title="Ouvrir la trame en plein écran"
                />
              }
              className="size-8 p-0"
            >
              <ArrowsOutSimple className="size-4" />
              <span className="sr-only">Plein écran</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ChapterReader chapters={chapters} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
