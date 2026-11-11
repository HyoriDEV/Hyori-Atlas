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
  BookOpen,
  Eye,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { countWords } from "@/lib/text-stats";
import type { ChapterItem } from "@/components/dashboard/chapter-reader";
import { ChapterReader } from "@/components/dashboard/chapter-reader";
import { ChapterEditor } from "@/components/player/chapter-editor";
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
import {
  createGroupChapterAction,
  deleteGroupChapterAction,
  duplicateGroupChapterAction,
  reorderGroupChaptersAction,
  updateGroupChapterContentAction,
  updateGroupChapterTitleAction,
} from "@/lib/actions/group-rp-tracking-actions";

function extractSnippet(html: string): string {
  if (!html) return "Chapitre vide...";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Chapitre vide...";
  return text.length > 65 ? text.slice(0, 65) + "…" : text;
}

export function GroupChapterWorkspace({
  groupId,
  initialChapters,
}: {
  groupId: string;
  initialChapters: ChapterItem[];
}) {
  const [chapters, setChapters] = useState<ChapterItem[]>(initialChapters);
  const [selectedId, setSelectedId] = useState<string>(
    initialChapters[0]?.id ?? ""
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [isPending, startTransition] = useTransition();

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedId),
    [chapters, selectedId]
  );

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q)
    );
  }, [chapters, searchQuery]);

  async function handleAddChapter() {
    startTransition(async () => {
      try {
        const nextNum = chapters.length + 1;
        const newChapter = await createGroupChapterAction(
          groupId,
          `Chapitre ${nextNum}`
        );
        const item: ChapterItem = {
          id: newChapter.id,
          title: newChapter.title,
          content: newChapter.content,
          order: newChapter.order,
          updatedAt: new Date(),
        };
        setChapters((prev) => [...prev, item]);
        setSelectedId(item.id);
        toast.success("Nouveau chapitre créé.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la création."
        );
      }
    });
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    const idToDelete = deletingId;
    setDeletingId(null);

    startTransition(async () => {
      try {
        await deleteGroupChapterAction(idToDelete);
        setChapters((prev) => {
          const next = prev.filter((c) => c.id !== idToDelete);
          if (selectedId === idToDelete) {
            setSelectedId(next[0]?.id ?? "");
          }
          return next;
        });
        toast.success("Chapitre supprimé.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la suppression."
        );
      }
    });
  }

  async function handleDuplicate(chapterId: string) {
    startTransition(async () => {
      try {
        const duplicate = await duplicateGroupChapterAction(chapterId);
        const item: ChapterItem = {
          id: duplicate.id,
          title: duplicate.title,
          content: duplicate.content,
          order: duplicate.order,
          updatedAt: new Date(),
        };
        setChapters((prev) => [...prev, item]);
        setSelectedId(item.id);
        toast.success("Chapitre dupliqué.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la duplication."
        );
      }
    });
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setChapters(reordered);

    try {
      await reorderGroupChaptersAction(
        groupId,
        reordered.map((c) => c.id)
      );
    } catch {
      toast.error("Erreur lors du réordonnancement.");
      setChapters(chapters);
    }
  }

  function handleTitleChange(newTitle: string) {
    setChapters((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, title: newTitle } : c))
    );
  }

  function handleContentChange(newContent: string) {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, content: newContent, updatedAt: new Date() }
          : c
      )
    );
  }

  if (previewMode) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary size-4" />
            <span className="text-sm font-medium">Prévisualisation de la narration</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(false)}
            className="h-8 gap-1.5 text-xs"
          >
            <PencilSimple className="size-3.5" />
            <span>Mode édition</span>
          </Button>
        </div>
        <ChapterReader chapters={chapters} className="min-h-0 flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Barre latérale des chapitres */}
      {isSidebarOpen && (
        <aside className="border-border bg-card/60 flex w-72 shrink-0 flex-col border-r transition-all">
          <div className="border-border flex shrink-0 items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <BookBookmark className="text-primary size-4" />
              <h4 className="font-heading text-sm font-semibold">
                Narration ({chapters.length})
              </h4>
            </div>
            <div className="flex items-center gap-1">
              {chapters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={() => setPreviewMode(true)}
                  title="Prévisualiser la narration"
                >
                  <Eye className="size-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={handleAddChapter}
                disabled={isPending}
              >
                <Plus className="size-3.5" />
                <span>Chapitre</span>
              </Button>
            </div>
          </div>

          {/* Recherche */}
          {chapters.length > 3 && (
            <div className="border-border shrink-0 border-b p-2">
              <div className="relative">
                <MagnifyingGlass className="text-muted-foreground absolute top-2.5 left-2 size-3.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer..."
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
          )}

          {/* Liste des chapitres */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredChapters.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-xs italic">
                {chapters.length === 0
                  ? "Aucun chapitre rédigé pour ce groupe. Cliquez sur + Chapitre pour commencer."
                  : "Aucun résultat."}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChapters.map((chapter, index) => {
                  const isSelected = chapter.id === selectedId;
                  const wordCount = countWords(chapter.content);

                  return (
                    <div
                      key={chapter.id}
                      onClick={() => setSelectedId(chapter.id)}
                      className={cn(
                        "group relative flex cursor-pointer items-start justify-between rounded-md p-2 text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 border-primary/30 border shadow-2xs"
                          : "hover:bg-muted/60"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-xs font-medium",
                              isSelected ? "text-primary" : "text-foreground"
                            )}
                          >
                            {chapter.title}
                          </span>
                        </div>
                        <p className="text-muted-foreground line-clamp-1 text-[11px]">
                          {extractSnippet(chapter.content)}
                        </p>
                        <span className="text-muted-foreground block text-[10px]">
                          {wordCount} mots
                        </span>
                      </div>

                      {/* Menu d'actions du chapitre */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground size-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DotsThreeVertical className="size-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="text-xs">
                          {index > 0 && (
                            <DropdownMenuItem onClick={() => handleMove(index, "up")}>
                              <ArrowUp className="mr-1.5 size-3.5" />
                              Monter
                            </DropdownMenuItem>
                          )}
                          {index < chapters.length - 1 && (
                            <DropdownMenuItem onClick={() => handleMove(index, "down")}>
                              <ArrowDown className="mr-1.5 size-3.5" />
                              Descendre
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(chapter.id)}>
                            <Copy className="mr-1.5 size-3.5" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingId(chapter.id)}
                          >
                            <Trash className="mr-1.5 size-3.5" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Éditeur de chapitre */}
      <main className="min-h-0 flex-1 overflow-hidden bg-background">
        {selectedChapter ? (
          <ChapterEditor
            key={selectedChapter.id}
            chapterId={selectedChapter.id}
            initialTitle={selectedChapter.title}
            initialContent={selectedChapter.content}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            saveContentAction={updateGroupChapterContentAction}
            saveTitleAction={updateGroupChapterTitleAction}
          />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm">
            <BookBookmark className="size-10 opacity-40" />
            <p>Sélectionnez un chapitre ou créez-en un nouveau pour ce groupe.</p>
            <Button size="sm" onClick={handleAddChapter} className="gap-2">
              <Plus className="size-4" />
              <span>Créer le premier chapitre</span>
            </Button>
          </div>
        )}
      </main>

      {/* Modal de suppression de chapitre */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contenu de ce chapitre sera définitivement effacé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
