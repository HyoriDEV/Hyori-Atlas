"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, PencilSimple, Plus, Trash } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  createBacklogLabelAction,
  deleteBacklogLabelAction,
  updateBacklogLabelAction,
} from "@/lib/actions/backlog-actions";
import {
  BACKLOG_LABEL_NAME_MAX_LENGTH,
  backlogLabelColorNames,
  backlogLabelColors,
  backlogLabelDotClasses,
  resolveBacklogLabelColor,
  type BacklogLabelColor,
  type BacklogLabelRef,
} from "@/lib/backlog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BacklogLabelChip } from "./backlog-task-card";

interface BacklogLabelPickerProps {
  labels: BacklogLabelRef[];
  selectedIds: string[];
  canManage: boolean;
  onChange: (labelIds: string[]) => void;
  onLabelSaved: (label: BacklogLabelRef) => void;
  onLabelDeleted: (labelId: string) => void;
}

type EditorState = { mode: "create" } | { mode: "edit"; label: BacklogLabelRef } | null;

export function BacklogLabelPicker({
  labels,
  selectedIds,
  canManage,
  onChange,
  onLabelSaved,
  onLabelDeleted,
}: BacklogLabelPickerProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const selected = labels.filter((l) => selectedIds.includes(l.id));

  function toggle(labelId: string) {
    onChange(
      selectedIds.includes(labelId)
        ? selectedIds.filter((id) => id !== labelId)
        : [...selectedIds, labelId]
    );
  }

  return (
    <Popover onOpenChange={(open) => !open && setEditor(null)}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="hover:bg-muted/60 flex min-h-8 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors"
          />
        }
      >
        {selected.length > 0 ? (
          selected.map((label) => <BacklogLabelChip key={label.id} label={label} />)
        ) : (
          <span className="text-muted-foreground">Aucune</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2">
        {editor ? (
          <LabelEditor
            key={editor.mode === "edit" ? editor.label.id : "create"}
            label={editor.mode === "edit" ? editor.label : null}
            onBack={() => setEditor(null)}
            onSaved={(label, created) => {
              onLabelSaved(label);
              if (created) onChange([...selectedIds, label.id]);
              setEditor(null);
            }}
            onDeleted={(labelId) => {
              onLabelDeleted(labelId);
              setEditor(null);
            }}
          />
        ) : (
          <>
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {labels.length === 0 && (
                <p className="text-muted-foreground px-1 py-2 text-xs">
                  Aucune étiquette pour le moment.
                </p>
              )}
              {labels.map((label) => {
                const isSelected = selectedIds.includes(label.id);
                return (
                  <div key={label.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggle(label.id)}
                      className="hover:bg-muted flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left"
                    >
                      <Check className={cn("size-3.5 shrink-0", !isSelected && "opacity-0")} />
                      <BacklogLabelChip label={label} />
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        aria-label={`Modifier l'étiquette ${label.name}`}
                        onClick={() => setEditor({ mode: "edit", label })}
                        className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <PencilSimple className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => setEditor({ mode: "create" })}
            >
              <Plus />
              Nouvelle étiquette
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function LabelEditor({
  label,
  onBack,
  onSaved,
  onDeleted,
}: {
  label: BacklogLabelRef | null;
  onBack: () => void;
  onSaved: (label: BacklogLabelRef, created: boolean) => void;
  onDeleted: (labelId: string) => void;
}) {
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState<BacklogLabelColor>(
    label ? resolveBacklogLabelColor(label.color) : "blue"
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!name.trim() || isPending) return;
    startTransition(async () => {
      const res = label
        ? await updateBacklogLabelAction(label.id, { name, color })
        : await createBacklogLabelAction({ name, color });
      if (!res.success || !res.data) {
        toast.error(res.error || "Erreur lors de l'enregistrement de l'étiquette.");
        return;
      }
      onSaved(res.data, !label);
    });
  }

  function remove() {
    if (!label || isPending) return;
    startTransition(async () => {
      const res = await deleteBacklogLabelAction(label.id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression de l'étiquette.");
        return;
      }
      toast.success(`L'étiquette « ${label.name} » a été supprimée.`);
      onDeleted(label.id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-xs" onClick={onBack} aria-label="Retour">
          <ArrowLeft />
        </Button>
        <span className="text-sm font-medium">
          {label ? "Modifier l'étiquette" : "Nouvelle étiquette"}
        </span>
      </div>
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        maxLength={BACKLOG_LABEL_NAME_MAX_LENGTH}
        placeholder="Nom de l'étiquette"
        aria-label="Nom de l'étiquette"
        disabled={isPending}
      />
      <div role="radiogroup" aria-label="Couleur" className="flex flex-wrap gap-1.5">
        {backlogLabelColors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={backlogLabelColorNames[c]}
            title={backlogLabelColorNames[c]}
            onClick={() => setColor(c)}
            className={cn(
              "size-6 cursor-pointer rounded-full transition-shadow",
              backlogLabelDotClasses[c],
              color === c && "ring-ring ring-offset-popover ring-2 ring-offset-2"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={remove}
            disabled={isPending}
          >
            <Trash />
            Supprimer
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" size="sm" onClick={save} disabled={isPending || !name.trim()}>
          {label ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </div>
  );
}
