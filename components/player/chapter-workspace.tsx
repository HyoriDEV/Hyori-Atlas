"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  Trash,
  DotsThreeVertical,
  ArrowUp,
  ArrowDown,
  MagnifyingGlass,
  BookBookmark,
  Copy,
  PencilSimple,
  FileText,
  BookOpen,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  createChapter,
  deleteChapter,
  duplicateChapter,
  reorderChapters,
  updateChapterTitle,
} from "@/lib/actions/chapter-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChapterEditor } from "@/components/player/chapter-editor";

export interface ChapterSummary {
  id: string;
  title: string;
  content: string;
  order: number;
}

function extractSnippet(html: string): string {
  if (!html) return "Chapitre vide...";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Chapitre vide...";
  return text.length > 65 ? text.slice(0, 65) + "…" : text;
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

export function ChapterWorkspace({
  initialChapters,
  chapterWritingEnabled = true,
}: {
  initialChapters: ChapterSummary[];
  chapterWritingEnabled?: boolean;
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    initialChapters[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chapterToDelete, setChapterToDelete] = useState<ChapterSummary | null>(null);
  const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId) ?? null;

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const query = searchQuery.toLowerCase().trim();
    return chapters.filter(
      (chap) =>
        chap.title.toLowerCase().includes(query) || chap.content.toLowerCase().includes(query)
    );
  }, [chapters, searchQuery]);

  const totalStats = useMemo(() => {
    const totalWords = chapters.reduce((sum, chap) => sum + countWords(chap.content), 0);
    const readingTime = Math.max(1, Math.ceil(totalWords / 200));
    return {
      chaptersCount: chapters.length,
      totalWords,
      readingTime,
    };
  }, [chapters]);

  function handleCreate() {
    if (!chapterWritingEnabled) {
      toast.error("L'écriture de narration a été temporairement désactivée par un administrateur.");
      return;
    }
    startTransition(async () => {
      try {
        const newTitle = `Chapitre ${chapters.length + 1}`;
        const chapter = await createChapter(newTitle);
        setChapters((previous) => [...previous, chapter]);
        setActiveChapterId(chapter.id);
        toast.success("Nouveau chapitre créé.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur lors de la création du chapitre."
        );
      }
    });
  }

  function handleDuplicate(chapterId: string) {
    startTransition(async () => {
      try {
        const duplicate = await duplicateChapter(chapterId);
        setChapters((previous) => [...previous, duplicate]);
        setActiveChapterId(duplicate.id);
        toast.success("Chapitre dupliqué avec succès.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur lors de la duplication du chapitre."
        );
      }
    });
  }

  function handleDeleteConfirm() {
    if (!chapterToDelete) return;
    const chapterId = chapterToDelete.id;
    setChapterToDelete(null);

    startTransition(async () => {
      try {
        await deleteChapter(chapterId);
        setChapters((previous) => {
          const next = previous.filter((chapter) => chapter.id !== chapterId);
          if (activeChapterId === chapterId) {
            setActiveChapterId(next[0]?.id ?? null);
          }
          return next;
        });
        toast.success("Chapitre supprimé.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur lors de la suppression du chapitre."
        );
      }
    });
  }

  function handleMove(chapterId: string, direction: -1 | 1) {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= chapters.length) return;

    const next = [...chapters];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setChapters(next);
    startTransition(async () => {
      await reorderChapters(next.map((chapter) => chapter.id));
    });
  }

  function handleTitleSave(chapterId: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title: trimmed } : c)));
  }

  function handleContentSave(chapterId: string, newContent: string) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, content: newContent } : c))
    );
  }

  function handleInlineRenameSubmit(chapterId: string) {
    const trimmed = renameDraft.trim();
    setRenamingChapterId(null);
    if (!trimmed) return;

    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title: trimmed } : c)));
    startTransition(async () => {
      await updateChapterTitle(chapterId, trimmed);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border/70 bg-card/40 flex min-h-0 flex-1 overflow-hidden rounded-xl border shadow-lg backdrop-blur-xs">
        {isSidebarOpen && (
          <aside className="border-border/70 bg-card/60 flex min-h-0 w-80 shrink-0 flex-col border-r transition-all sm:w-[22rem]">
            <div className="border-border/60 flex shrink-0 flex-col gap-3.5 border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookBookmark className="text-primary size-4.5" />
                  <span className="font-heading text-base font-semibold tracking-wide">
                    Chapitres
                  </span>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCreate}
                  disabled={isPending}
                  className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Nouveau</span>
                </Button>
              </div>

              <div className="relative">
                <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un chapitre..."
                  className="bg-background/50 h-9 pl-9 text-sm"
                />
              </div>

              <div className="bg-muted/40 text-muted-foreground flex items-center justify-between rounded-md px-3 py-2 text-xs">
                <span className="text-foreground/80 font-medium">Trame complète :</span>
                <span>
                  {totalStats.chaptersCount} chapitre{totalStats.chaptersCount > 1 ? "s" : ""}
                </span>
                <span>•</span>
                <span>{totalStats.totalWords.toLocaleString("fr-FR")} mots</span>
                <span>•</span>
                <span>~{totalStats.readingTime} min</span>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
              {filteredChapters.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center text-sm">
                  {searchQuery ? (
                    <p>Aucun chapitre ne correspond à « {searchQuery} ».</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <FileText className="size-9 opacity-40" />
                      <p>Aucun chapitre créé.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCreate}
                        className="mt-1 text-xs"
                      >
                        Créer le premier chapitre
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                filteredChapters.map((chapter, index) => {
                  const isActive = activeChapterId === chapter.id;
                  const wordCount = countWords(chapter.content);
                  const isRenaming = renamingChapterId === chapter.id;

                  return (
                    <div
                      key={chapter.id}
                      className={cn(
                        "group relative flex flex-col gap-1.5 rounded-lg border border-transparent p-3 transition-all",
                        isActive
                          ? "bg-card border-border/80 ring-primary/40 shadow-xs ring-1"
                          : "hover:bg-muted/40 hover:border-border/40"
                      )}
                    >
                      {isActive && (
                        <div className="bg-primary absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full" />
                      )}

                      <div className="flex items-center justify-between gap-2 pl-1">
                        {isRenaming ? (
                          <div className="flex flex-1 items-center gap-1">
                            <Input
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleInlineRenameSubmit(chapter.id);
                                if (e.key === "Escape") setRenamingChapterId(null);
                              }}
                              onBlur={() => handleInlineRenameSubmit(chapter.id)}
                              autoFocus
                              className="h-7 text-xs font-semibold"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveChapterId(chapter.id)}
                            className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
                          >
                            <span className="text-primary/90 shrink-0 font-mono text-xs font-semibold">
                              {String(index + 1).padStart(2, "0")}.
                            </span>
                            <span
                              className={cn(
                                "truncate text-base leading-tight font-medium",
                                isActive ? "text-foreground font-semibold" : "text-foreground/85"
                              )}
                            >
                              {chapter.title}
                            </span>
                          </button>
                        )}

                        {chapterWritingEnabled && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label="Options du chapitre"
                                  className="text-muted-foreground hover:text-foreground size-7 shrink-0 p-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                />
                              }
                            >
                              <DotsThreeVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameDraft(chapter.title);
                                  setRenamingChapterId(chapter.id);
                                }}
                                className="gap-2.5 py-1.5 text-sm"
                              >
                                <PencilSimple className="size-4" />
                                <span>Renommer</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(chapter.id)}
                                className="gap-2.5 py-1.5 text-sm"
                              >
                                <Copy className="size-4" />
                                <span>Dupliquer</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={index === 0}
                                onClick={() => handleMove(chapter.id, -1)}
                                className="gap-2.5 py-1.5 text-sm"
                              >
                                <ArrowUp className="size-4" />
                                <span>Monter</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={index === chapters.length - 1}
                                onClick={() => handleMove(chapter.id, 1)}
                                className="gap-2.5 py-1.5 text-sm"
                              >
                                <ArrowDown className="size-4" />
                                <span>Descendre</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setChapterToDelete(chapter)}
                                className="text-destructive focus:text-destructive gap-2.5 py-1.5 text-sm"
                              >
                                <Trash className="size-4" />
                                <span>Supprimer</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveChapterId(chapter.id)}
                        className="pl-1 text-left"
                      >
                        <p className="text-muted-foreground/85 line-clamp-2 text-xs leading-relaxed">
                          {extractSnippet(chapter.content)}
                        </p>
                      </button>

                      <div className="text-muted-foreground/75 mt-1 flex items-center justify-between pl-1 text-xs">
                        <span>
                          {wordCount} mot{wordCount > 1 ? "s" : ""}
                        </span>
                        <span>~{Math.max(1, Math.ceil(wordCount / 200))} min</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        <main className="bg-background/50 flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeChapter ? (
            <ChapterEditor
              key={activeChapter.id}
              chapterId={activeChapter.id}
              initialTitle={activeChapter.title}
              initialContent={activeChapter.content}
              onTitleChange={(newTitle) => handleTitleSave(activeChapter.id, newTitle)}
              onContentChange={(newContent) => handleContentSave(activeChapter.id, newContent)}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              readOnly={!chapterWritingEnabled}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="border-border/60 bg-card/60 flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 shadow-sm">
                <BookOpen className="text-primary size-10 opacity-70" />
                <h3 className="font-heading text-lg font-semibold">Aucun chapitre sélectionné</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Crée ton premier chapitre ou sélectionne-en un dans la barre latérale pour débuter
                  l&apos;écriture de ta trame roleplay.
                </p>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCreate}
                  disabled={isPending}
                  className="mt-2 gap-1.5 text-xs font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>Créer un chapitre</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <AlertDialog
        open={Boolean(chapterToDelete)}
        onOpenChange={(open) => {
          if (!open) setChapterToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le chapitre</AlertDialogTitle>
            <AlertDialogDescription>
              Le chapitre « {chapterToDelete?.title} » ainsi que tout son contenu seront
              définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
