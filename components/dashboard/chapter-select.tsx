"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ChapterSelectItem {
  id: string;
  title: string;
}

export function ChapterSelect({
  chapters,
  className,
}: {
  chapters: ChapterSelectItem[];
  className?: string;
}) {
  function handleSelect(chapterId: string) {
    const element = document.getElementById(`chapter-${chapterId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (chapters.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8.5 justify-between gap-2 px-3 text-xs font-medium shadow-xs sm:text-sm",
              className
            )}
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <span>Saut rapide à un chapitre</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto sm:w-64">
        {chapters.map((chapter, index) => (
          <DropdownMenuItem
            key={chapter.id}
            onClick={() => handleSelect(chapter.id)}
            className="cursor-pointer items-baseline gap-2 py-1.5 text-xs sm:text-sm"
          >
            <span className="text-primary/90 shrink-0 font-mono text-xs font-semibold">
              {String(index + 1).padStart(2, "0")}.
            </span>
            <span className="truncate font-medium">{chapter.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
