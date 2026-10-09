"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { fr } from "date-fns/locale";
import {
  Archive,
  ArrowCounterClockwise,
  ArrowSquareOut,
  CalendarBlank,
  Ticket,
  Trash,
  X,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import {
  deleteBacklogTaskAction,
  getBacklogTaskDetailAction,
  setBacklogTaskArchivedAction,
  updateBacklogTaskAction,
} from "@/lib/actions/backlog-actions";
import {
  BACKLOG_TITLE_MAX_LENGTH,
  backlogPriorityLabels,
  backlogPriorityOrder,
  backlogStatusDotClasses,
  backlogStatusLabels,
  backlogStatusOrder,
  describeBacklogActivity,
  fromBacklogDueDateIso,
  getBacklogDueState,
  toBacklogDueDateIso,
  type BacklogLabelRef,
  type BacklogTaskDetail,
  type BacklogUserRef,
} from "@/lib/backlog";
import type { BacklogPriority, BacklogStatus } from "@/lib/generated/prisma/enums";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BacklogChecklist, type BacklogDetailMutator } from "./backlog-checklist";
import { BacklogLabelPicker } from "./backlog-label-picker";
import { BacklogPriorityIcon, BacklogUserAvatar } from "./backlog-task-card";

const UNASSIGNED = "NONE";
const DESCRIPTION_AUTOSAVE_DELAY_MS = 800;

interface BacklogTaskSheetProps {
  taskId: string | null;
  users: BacklogUserRef[];
  labels: BacklogLabelRef[];
  currentUserId: string;
  canManage: boolean;
  onClose: () => void;
  onTaskChange: (detail: BacklogTaskDetail) => void;
  onTaskDeleted: (taskId: string) => void;
  onLabelSaved: (label: BacklogLabelRef) => void;
  onLabelDeleted: (labelId: string) => void;
}

export function BacklogTaskSheet({
  taskId,
  users,
  labels,
  currentUserId,
  canManage,
  onClose,
  onTaskChange,
  onTaskDeleted,
  onLabelSaved,
  onLabelDeleted,
}: BacklogTaskSheetProps) {
  const [loaded, setLoaded] = useState<BacklogTaskDetail | null>(null);
  const detail = loaded && loaded.id === taskId ? loaded : null;

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    getBacklogTaskDetailAction(taskId).then((res) => {
      if (cancelled) return;
      if (!res.success || !res.data) {
        toast.error(res.error || "Impossible de charger la tâche.");
        onClose();
        return;
      }
      setLoaded(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId, onClose]);

  const applyDetail = useCallback(
    (next: BacklogTaskDetail) => {
      setLoaded((prev) => (prev && prev.id !== next.id ? prev : next));
      onTaskChange(next);
    },
    [onTaskChange]
  );

  const mutate = useCallback<BacklogDetailMutator>(
    (run, optimistic) => {
      if (optimistic) {
        setLoaded((prev) => (prev ? optimistic(prev) : prev));
      }
      run().then((res) => {
        if (res.success && res.data) {
          applyDetail(res.data);
          return;
        }
        toast.error(res.error || "La modification n'a pas pu être enregistrée.");
        // L'état optimiste est remplacé par l'état réel de la tâche.
        if (taskId) {
          getBacklogTaskDetailAction(taskId).then((fresh) => {
            if (fresh.success && fresh.data) applyDetail(fresh.data);
          });
        }
      });
    },
    [applyDetail, taskId]
  );

  return (
    <Sheet open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 text-sm data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {detail ? (
          <TaskSheetBody
            key={detail.id}
            detail={detail}
            users={users}
            labels={labels}
            canDelete={canManage || detail.createdById === currentUserId}
            canManage={canManage}
            mutate={mutate}
            applyDetail={applyDetail}
            onDeleted={() => {
              onTaskDeleted(detail.id);
              onClose();
            }}
            onLabelSaved={onLabelSaved}
            onLabelDeleted={onLabelDeleted}
          />
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <SheetTitle className="sr-only">Chargement de la tâche</SheetTitle>
            <SheetDescription className="sr-only">
              Détail d&apos;une tâche du backlog
            </SheetDescription>
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-sm font-semibold">{children}</h3>;
}

function TaskSheetBody({
  detail,
  users,
  labels,
  canDelete,
  canManage,
  mutate,
  applyDetail,
  onDeleted,
  onLabelSaved,
  onLabelDeleted,
}: {
  detail: BacklogTaskDetail;
  users: BacklogUserRef[];
  labels: BacklogLabelRef[];
  canDelete: boolean;
  canManage: boolean;
  mutate: BacklogDetailMutator;
  applyDetail: (detail: BacklogTaskDetail) => void;
  onDeleted: () => void;
  onLabelSaved: (label: BacklogLabelRef) => void;
  onLabelDeleted: (labelId: string) => void;
}) {
  const [title, setTitle] = useState(detail.title);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isArchived = detail.archivedAt !== null;
  const dueState = getBacklogDueState(detail.dueDate, detail.status);

  function update(
    patch: Parameters<typeof updateBacklogTaskAction>[1],
    optimistic?: Partial<BacklogTaskDetail>
  ) {
    mutate(
      () => updateBacklogTaskAction(detail.id, patch),
      optimistic ? (current) => ({ ...current, ...optimistic }) : undefined
    );
  }

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(detail.title);
      return;
    }
    if (trimmed !== detail.title) {
      update({ title: trimmed }, { title: trimmed });
    }
  }

  function handleDelete() {
    setIsDeleting(true);
    deleteBacklogTaskAction(detail.id).then((res) => {
      setIsDeleting(false);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression de la tâche.");
        return;
      }
      toast.success("La tâche a été supprimée.");
      onDeleted();
    });
  }

  const statusItems = backlogStatusOrder.map((status) => ({
    value: status,
    label: backlogStatusLabels[status],
  }));
  const priorityItems = backlogPriorityOrder.map((priority) => ({
    value: priority,
    label: backlogPriorityLabels[priority],
  }));
  const assignees = users.filter((user) => user.assignable || user.id === detail.assigneeId);
  const assigneeItems = [
    { value: UNASSIGNED, label: "Non assignée" },
    ...assignees.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <>
      <div className="border-border flex shrink-0 flex-col gap-1 border-b p-6 pr-14 pb-4">
        <SheetTitle className="sr-only">{detail.title}</SheetTitle>
        <SheetDescription className="sr-only">Détail d&apos;une tâche du backlog</SheetDescription>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          maxLength={BACKLOG_TITLE_MAX_LENGTH}
          rows={1}
          aria-label="Titre de la tâche"
          className="font-heading hover:bg-muted/60 focus:bg-muted/60 -mx-1.5 field-sizing-content resize-none rounded-md bg-transparent px-1.5 py-1 text-lg leading-snug font-semibold outline-none"
        />
        <p className="text-muted-foreground text-xs">
          Créée {detail.createdByName ? `par ${detail.createdByName} ` : ""}
          {formatDate(detail.createdAt, { style: "prefix-long", withTime: false, withYear: true })}
          {isArchived && " · Archivée"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col gap-1.5">
          <FieldRow label="Statut">
            <Select
              items={statusItems}
              value={detail.status}
              onValueChange={(value) => {
                if (value && value !== detail.status) {
                  update({ status: value }, { status: value as BacklogStatus });
                }
              }}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backlogStatusOrder.map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className={cn("size-2 rounded-full", backlogStatusDotClasses[status])} />
                    {backlogStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Priorité">
            <Select
              items={priorityItems}
              value={detail.priority}
              onValueChange={(value) => {
                if (value && value !== detail.priority) {
                  update({ priority: value }, { priority: value as BacklogPriority });
                }
              }}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Priorité">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backlogPriorityOrder.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    <BacklogPriorityIcon priority={priority} />
                    {backlogPriorityLabels[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Assignée à">
            <Select
              items={assigneeItems}
              value={detail.assigneeId ?? UNASSIGNED}
              onValueChange={(value) => {
                const assigneeId = !value || value === UNASSIGNED ? null : value;
                if (assigneeId !== detail.assigneeId) {
                  update({ assigneeId }, { assigneeId });
                }
              }}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Assignée à">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Non assignée</SelectItem>
                {assignees.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <BacklogUserAvatar user={user} className="size-4" />
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Échéance">
            <div className="flex items-center gap-1">
              <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-muted/60 flex h-7 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-xs transition-colors",
                        !detail.dueDate && "text-muted-foreground",
                        dueState === "overdue" && "font-medium text-red-600 dark:text-red-400",
                        dueState === "soon" && "font-medium text-amber-600 dark:text-amber-400"
                      )}
                    />
                  }
                >
                  <CalendarBlank className="size-3.5" />
                  {detail.dueDate
                    ? formatDate(detail.dueDate, {
                        style: "prefix-long",
                        withTime: false,
                        withYear: true,
                      })
                    : "Aucune"}
                  {dueState === "overdue" && " · dépassée"}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    locale={fr}
                    selected={detail.dueDate ? fromBacklogDueDateIso(detail.dueDate) : undefined}
                    defaultMonth={
                      detail.dueDate ? fromBacklogDueDateIso(detail.dueDate) : undefined
                    }
                    onSelect={(date) => {
                      setIsDueDateOpen(false);
                      if (!date) return;
                      const dueDate = toBacklogDueDateIso(date);
                      if (dueDate !== detail.dueDate) update({ dueDate }, { dueDate });
                    }}
                  />
                </PopoverContent>
              </Popover>
              {detail.dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Retirer l'échéance"
                  title="Retirer l'échéance"
                  onClick={() => update({ dueDate: null }, { dueDate: null })}
                >
                  <X />
                </Button>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Étiquettes">
            <BacklogLabelPicker
              labels={labels}
              selectedIds={detail.labelIds}
              canManage={canManage}
              onChange={(labelIds) => update({ labelIds }, { labelIds })}
              onLabelSaved={onLabelSaved}
              onLabelDeleted={onLabelDeleted}
            />
          </FieldRow>

          {detail.ticket && (
            <FieldRow label="Ticket lié">
              {detail.ticket.accessible ? (
                <Link
                  href={`/staff/tickets/${detail.ticket.id}`}
                  className="hover:bg-muted/60 flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
                >
                  <Ticket className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{detail.ticket.subject}</span>
                  <ArrowSquareOut className="text-muted-foreground size-3.5 shrink-0" />
                </Link>
              ) : (
                <span
                  className="text-muted-foreground flex min-h-7 items-center gap-1.5 px-2 py-1 text-xs"
                  title="Vous n'avez pas accès à ce ticket. Demandez à un Helper de convoquer votre équipe."
                >
                  <Ticket className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{detail.ticket.subject}</span>
                </span>
              )}
            </FieldRow>
          )}
        </div>

        <section className="flex flex-col gap-2">
          <SectionTitle>Description</SectionTitle>
          <DescriptionEditor
            taskId={detail.id}
            initialValue={detail.description}
            onSaved={applyDetail}
          />
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>Checklist</SectionTitle>
          <BacklogChecklist taskId={detail.id} items={detail.checklistItems} mutate={mutate} />
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>Activité</SectionTitle>
          <ul className="flex flex-col gap-2">
            {detail.activities.map((activity) => (
              <li key={activity.id} className="text-xs leading-relaxed">
                <span className="font-medium">{activity.authorName ?? "Quelqu'un"}</span>{" "}
                <span className="text-muted-foreground">{describeBacklogActivity(activity)}</span>
                <span className="text-muted-foreground/70">
                  {" · "}
                  {formatDate(activity.createdAt, { style: "chat" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-6 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            mutate(
              () => setBacklogTaskArchivedAction(detail.id, !isArchived),
              (current) => ({
                ...current,
                archivedAt: isArchived ? null : new Date().toISOString(),
              })
            )
          }
        >
          {isArchived ? <ArrowCounterClockwise /> : <Archive />}
          {isArchived ? "Restaurer" : "Archiver"}
        </Button>

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                />
              }
            >
              <Trash />
              Supprimer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la tâche</AlertDialogTitle>
                <AlertDialogDescription>
                  « {detail.title} » sera supprimée définitivement, avec sa checklist et son
                  historique. Pour la conserver, archivez-la plutôt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  );
}

function DescriptionEditor({
  taskId,
  initialValue,
  onSaved,
}: {
  taskId: string;
  initialValue: string;
  onSaved: (detail: BacklogTaskDetail) => void;
}) {
  const pendingValue = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const value = pendingValue.current;
    if (value === null) return;
    pendingValue.current = null;
    updateBacklogTaskAction(taskId, { description: value }).then((res) => {
      if (!res.success || !res.data) {
        toast.error(res.error || "La description n'a pas pu être enregistrée.");
        return;
      }
      onSaved(res.data);
    });
  }, [taskId, onSaved]);

  // La saisie en attente est enregistrée à la fermeture du panneau.
  useEffect(() => flush, [flush]);

  return (
    <RichTextEditor
      value={initialValue}
      onChange={(value) => {
        pendingValue.current = value;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, DESCRIPTION_AUTOSAVE_DELAY_MS);
      }}
    />
  );
}
