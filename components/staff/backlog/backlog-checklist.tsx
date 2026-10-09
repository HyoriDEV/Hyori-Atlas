"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  addBacklogChecklistItemAction,
  deleteBacklogChecklistItemAction,
  updateBacklogChecklistItemAction,
  type BacklogActionResult,
} from "@/lib/actions/backlog-actions";
import {
  BACKLOG_CHECKLIST_ITEM_MAX_LENGTH,
  type BacklogChecklistItemData,
  type BacklogTaskDetail,
} from "@/lib/backlog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type BacklogDetailMutator = (
  run: () => Promise<BacklogActionResult<BacklogTaskDetail>>,
  optimistic?: (detail: BacklogTaskDetail) => BacklogTaskDetail
) => void;

interface BacklogChecklistProps {
  taskId: string;
  items: BacklogChecklistItemData[];
  mutate: BacklogDetailMutator;
}

function withItems(
  detail: BacklogTaskDetail,
  checklistItems: BacklogChecklistItemData[]
): BacklogTaskDetail {
  return {
    ...detail,
    checklistItems,
    checklistTotal: checklistItems.length,
    checklistDone: checklistItems.filter((i) => i.done).length,
  };
}

export function BacklogChecklist({ taskId, items, mutate }: BacklogChecklistProps) {
  const [draft, setDraft] = useState("");
  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  function addItem() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    mutate(() => addBacklogChecklistItemAction(taskId, content));
  }

  function toggleItem(item: BacklogChecklistItemData, done: boolean) {
    mutate(
      () => updateBacklogChecklistItemAction(item.id, { done }),
      (detail) =>
        withItems(
          detail,
          detail.checklistItems.map((i) => (i.id === item.id ? { ...i, done } : i))
        )
    );
  }

  function renameItem(item: BacklogChecklistItemData, raw: string) {
    const content = raw.trim();
    if (!content || content === item.content) return;
    mutate(
      () => updateBacklogChecklistItemAction(item.id, { content }),
      (detail) =>
        withItems(
          detail,
          detail.checklistItems.map((i) => (i.id === item.id ? { ...i, content } : i))
        )
    );
  }

  function removeItem(item: BacklogChecklistItemData) {
    mutate(
      () => deleteBacklogChecklistItemAction(item.id),
      (detail) =>
        withItems(
          detail,
          detail.checklistItems.filter((i) => i.id !== item.id)
        )
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de la checklist"
            className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {doneCount}/{items.length}
          </span>
        </div>
      )}

      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 py-0.5">
            <Checkbox
              checked={item.done}
              onCheckedChange={(checked) => toggleItem(item, checked === true)}
              aria-label={item.content}
            />
            <input
              // La clé réinitialise le champ quand le contenu enregistré change.
              key={item.content}
              defaultValue={item.content}
              maxLength={BACKLOG_CHECKLIST_ITEM_MAX_LENGTH}
              aria-label="Élément de checklist"
              onBlur={(e) => {
                if (!e.target.value.trim()) e.target.value = item.content;
                renameItem(item, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className={cn(
                "hover:bg-muted/60 focus:bg-muted/60 min-w-0 flex-1 rounded-sm bg-transparent px-1.5 py-1 text-sm outline-none",
                item.done && "text-muted-foreground line-through"
              )}
            />
            <button
              type="button"
              aria-label={`Supprimer « ${item.content} »`}
              onClick={() => removeItem(item)}
              className="text-muted-foreground hover:text-destructive cursor-pointer rounded-sm p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <Plus className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          maxLength={BACKLOG_CHECKLIST_ITEM_MAX_LENGTH}
          placeholder="Ajouter un élément…"
          aria-label="Nouvel élément de checklist"
          className="h-8 pl-8 text-sm"
        />
      </div>
    </div>
  );
}
