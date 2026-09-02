"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import DOMPurify from "isomorphic-dompurify";
import { TextAa, Sun, Moon, BookOpen } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FONT_FAMILY_STORAGE_KEY = "hyori_writing_font_family";
const FONT_SIZE_STORAGE_KEY = "hyori_writing_font_size";
const THEME_STORAGE_KEY = "hyori_writing_theme";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useWritingPreference<T extends string>(
  key: string,
  defaultValue: T,
  isValid: (val: string) => boolean
): [T, (val: T) => void] {
  const [override, setOverride] = useState<T | null>(null);

  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem(key);
        if (val && isValid(val)) return val as T;
      } catch {}
      return defaultValue;
    },
    () => defaultValue
  );

  const value = override ?? stored;

  const setValue = (val: T) => {
    setOverride(val);
    try {
      localStorage.setItem(key, val);
    } catch {}
  };

  return [value, setValue];
}

function countWords(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

function sanitizeChapterHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
  });
}

export interface ChapterItem {
  id: string;
  title: string;
  content: string;
  order?: number;
}

export function ChapterReader({ chapters }: { chapters: ChapterItem[] }) {
  const [fontFamily, setFontFamily] = useWritingPreference<"serif" | "sans">(
    FONT_FAMILY_STORAGE_KEY,
    "serif",
    (val) => val === "serif" || val === "sans"
  );
  const [fontSize, setFontSize] = useWritingPreference<"small" | "normal" | "large">(
    FONT_SIZE_STORAGE_KEY,
    "normal",
    (val) => val === "small" || val === "normal" || val === "large"
  );
  const [theme, setTheme] = useWritingPreference<"dark" | "light">(
    THEME_STORAGE_KEY,
    "dark",
    (val) => val === "dark" || val === "light"
  );

  function handleThemeToggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const totalStats = useMemo(() => {
    const totalWords = chapters.reduce((sum, chap) => sum + countWords(chap.content), 0);
    const readingTime = Math.max(1, Math.ceil(totalWords / 200));
    return {
      chaptersCount: chapters.length,
      totalWords,
      readingTime,
    };
  }, [chapters]);

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("a");
    if (target && target.href) {
      target.setAttribute("target", "_blank");
      target.setAttribute("rel", "noopener noreferrer");
    }
  }

  if (chapters.length === 0) {
    return (
      <div className="border-border/60 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <BookOpen className="text-muted-foreground/60 mb-3 size-10" />
        <p className="text-base font-medium">Aucun chapitre rédigé pour le moment.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Le joueur n&apos;a pas encore créé de chapitre pour sa trame.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/70 bg-card/40 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-xs transition-colors duration-200",
        theme === "light" && "editor-light"
      )}
    >
      <div className="bg-card/90 border-border/80 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-2.5 backdrop-blur-md">
        <div className="text-muted-foreground flex items-center gap-2.5 text-xs sm:text-sm">
          <span className="text-foreground/90 font-semibold">
            {totalStats.chaptersCount} chapitre{totalStats.chaptersCount > 1 ? "s" : ""}
          </span>
          <span className="text-border">•</span>
          <span>
            {totalStats.totalWords.toLocaleString("fr-FR")} mot
            {totalStats.totalWords > 1 ? "s" : ""}
          </span>
          <span className="text-border">•</span>
          <span>~{totalStats.readingTime} min de lecture</span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Préférences typographiques"
                        className="text-muted-foreground hover:text-foreground size-8 p-1"
                      />
                    }
                  >
                    <TextAa className="size-4" />
                  </DropdownMenuTrigger>
                }
              >
                <TextAa className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Préférences typographiques</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className={cn("w-60", theme === "light" && "editor-light")}
            >
              <DropdownMenuRadioGroup
                value={fontFamily}
                onValueChange={(val) => setFontFamily(val as "serif" | "sans")}
              >
                <DropdownMenuLabel className="text-xs">Police du texte</DropdownMenuLabel>
                <DropdownMenuRadioItem value="serif" className="py-1.5 text-sm">
                  Source Serif (Livre classique)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sans" className="py-1.5 text-sm">
                  Inter (Moderne épuré)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuRadioGroup
                value={fontSize}
                onValueChange={(val) => setFontSize(val as "small" | "normal" | "large")}
              >
                <DropdownMenuLabel className="text-xs">Taille du texte</DropdownMenuLabel>
                <DropdownMenuRadioItem value="small" className="py-1.5 text-sm">
                  Petite
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="normal" className="py-1.5 text-sm">
                  Standard
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="large" className="py-1.5 text-sm">
                  Grande
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleThemeToggle}
                  aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                  className="text-muted-foreground hover:text-foreground size-8 p-1"
                />
              }
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        onClick={handleContentClick}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 pt-10 pb-16 sm:px-8 lg:px-12",
          fontSize === "small" && "chapter-size-small",
          fontSize === "normal" && "chapter-size-normal",
          fontSize === "large" && "chapter-size-large"
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="flex flex-col">
              {index > 0 && (
                <div
                  className="text-primary/40 my-14 flex items-center justify-center text-xs tracking-[0.8em] select-none"
                  aria-hidden="true"
                >
                  ♦ ♦ ♦
                </div>
              )}

              <article
                id={`chapter-${chapter.id}`}
                className="flex scroll-mt-8 flex-col sm:scroll-mt-10"
              >
                <header className="mb-6 flex flex-col gap-1.5">
                  <div
                    className={cn(
                      "chapter-kicker text-primary/90 flex items-center gap-2.5 font-medium tracking-widest uppercase",
                      fontFamily === "serif" ? "font-heading" : "font-chapter-sans"
                    )}
                  >
                    <span className="bg-primary/70 h-px w-7 shrink-0" aria-hidden="true" />
                    <span>Chapitre {index + 1}</span>
                  </div>
                  <h2
                    className={cn(
                      "chapter-main-title text-foreground font-bold tracking-tight",
                      fontFamily === "serif" ? "font-heading" : "font-chapter-sans"
                    )}
                  >
                    {chapter.title}
                  </h2>
                </header>

                <div
                  className={cn(
                    "chapter-content text-justify",
                    fontFamily === "serif" ? "font-chapter-serif" : "font-chapter-sans"
                  )}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeChapterHtml(chapter.content),
                  }}
                />
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
