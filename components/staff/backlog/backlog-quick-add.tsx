"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";

import { createBacklogTaskAction } from "@/lib/actions/backlog-actions";
import { BACKLOG_TITLE_MAX_LENGTH, type BacklogTaskCard } from "@/lib/backlog";
import type { BacklogStatus } from "@/lib/generated/prisma/enums";
import { Textarea } from "@/components/ui/textarea";

interface BacklogQuickAddProps {
  status: BacklogStatus;
  onCreated: (task: BacklogTaskCard) => void;
}

export function BacklogQuickAdd({ status, onCreated }: BacklogQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setIsOpen(false);
    setTitle("");
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      const res = await createBacklogTaskAction({ title: trimmed, status });
      if (!res.success || !res.data) {
        toast.error(res.error || "Erreur lors de la création de la tâche.");
        return;
      }
      onCreated(res.data);
      // Le champ reste ouvert pour enchaîner les créations.
      setTitle("");
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
      >
        <Plus className="size-3.5" />
        Ajouter une tâche
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        onBlur={() => {
          if (!title.trim()) close();
        }}
        maxLength={BACKLOG_TITLE_MAX_LENGTH}
        rows={2}
        placeholder="Titre de la tâche…"
        aria-label="Titre de la nouvelle tâche"
        className="bg-card min-h-0 resize-none text-sm"
      />
      <span className="text-muted-foreground px-1 text-[11px]">
        Entrée pour créer · Échap pour fermer
      </span>
    </div>
  );
}
