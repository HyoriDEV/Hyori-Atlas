"use client";

import { useState, useTransition } from "react";
import { CaretDown, CaretUp, Plus, Trash } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  createChapter,
  deleteChapter,
  reorderChapters,
  updateChapterTitle,
} from "@/lib/actions/chapter-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChapterEditor } from "@/components/player/chapter-editor";

export interface ChapterSummary {
  id: string;
  title: string;
  content: string;
  order: number;
}

export function ChapterWorkspace({ initialChapters }: { initialChapters: ChapterSummary[] }) {
  const [chapters, setChapters] = useState(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    initialChapters[0]?.id ?? null
  );
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId) ?? null;

  function handleCreate() {
    startTransition(async () => {
      const chapter = await createChapter("Nouveau chapitre");
      setChapters((previous) => [...previous, chapter]);
      setActiveChapterId(chapter.id);
    });
  }

  function handleDelete(chapterId: string) {
    startTransition(async () => {
      await deleteChapter(chapterId);
      setChapters((previous) => {
        const next = previous.filter((chapter) => chapter.id !== chapterId);
        if (activeChapterId === chapterId) {
          setActiveChapterId(next[0]?.id ?? null);
        }
        return next;
      });
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

  function handleTitleBlur(chapterId: string) {
    const draft = titleDrafts[chapterId];
    setTitleDrafts((previous) => {
      const next = { ...previous };
      delete next[chapterId];
      return next;
    });
    if (draft === undefined) return;
    const trimmed = draft.trim();
    if (!trimmed) return;

    setChapters((previous) =>
      previous.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, title: trimmed } : chapter
      )
    );
    startTransition(async () => {
      await updateChapterTitle(chapterId, trimmed);
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[18rem_1fr]">
      <Card className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Chapitres
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCreate}
            disabled={isPending}
            aria-label="Nouveau chapitre"
          >
            <Plus />
          </Button>
        </div>

        {chapters.length === 0 ? (
          <p className="text-muted-foreground px-1 text-xs">Aucun chapitre pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-1",
                  activeChapterId === chapter.id && "bg-muted"
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveChapterId(chapter.id)}
                  className="flex-1 truncate px-1.5 py-1.5 text-left text-sm"
                >
                  {chapter.title}
                </button>
                <div className="hidden items-center gap-0.5 group-hover:flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    onClick={() => handleMove(chapter.id, -1)}
                    aria-label="Monter"
                  >
                    <CaretUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === chapters.length - 1}
                    onClick={() => handleMove(chapter.id, 1)}
                    aria-label="Descendre"
                  >
                    <CaretDown />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Supprimer"
                        />
                      }
                    >
                      <Trash />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le chapitre</AlertDialogTitle>
                        <AlertDialogDescription>
                          « {chapter.title} » sera définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(chapter.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        {activeChapter ? (
          <>
            <Input
              value={titleDrafts[activeChapter.id] ?? activeChapter.title}
              onChange={(event) =>
                setTitleDrafts((previous) => ({
                  ...previous,
                  [activeChapter.id]: event.target.value,
                }))
              }
              onBlur={() => handleTitleBlur(activeChapter.id)}
              className="font-heading h-auto border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            />
            <ChapterEditor
              key={activeChapter.id}
              chapterId={activeChapter.id}
              initialContent={activeChapter.content}
            />
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-1 py-16 text-center">
              <p className="text-base font-medium">Aucun chapitre sélectionné</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Crée un nouveau chapitre pour commencer à écrire.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
