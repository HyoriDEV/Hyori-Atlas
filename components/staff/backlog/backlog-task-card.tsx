"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarBlank, CheckSquare, TextAlignLeft, Ticket } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import {
  backlogLabelChipClasses,
  backlogPriorityLabels,
  backlogPriorityTextClasses,
  getBacklogDueState,
  resolveBacklogLabelColor,
  type BacklogLabelRef,
  type BacklogTaskCard as BacklogTaskCardData,
  type BacklogUserRef,
} from "@/lib/backlog";
import { BacklogPriority } from "@/lib/generated/prisma/enums";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function BacklogLabelChip({
  label,
  className,
}: {
  label: BacklogLabelRef;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-5 max-w-full truncate rounded-sm px-1.5 text-[11px] leading-5 font-medium",
        backlogLabelChipClasses[resolveBacklogLabelColor(label.color)],
        className
      )}
    >
      {label.name}
    </span>
  );
}

export function BacklogUserAvatar({
  user,
  className,
}: {
  user: BacklogUserRef;
  className?: string;
}) {
  return (
    <Avatar size="sm" className={className} title={user.name}>
      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

const PRIORITY_BAR_COUNT: Record<BacklogPriority, number> = {
  [BacklogPriority.LOW]: 1,
  [BacklogPriority.MEDIUM]: 2,
  [BacklogPriority.HIGH]: 3,
  [BacklogPriority.URGENT]: 4,
};

/** Barres de priorité : plus la priorité est haute, plus il y a de barres pleines. */
export function BacklogPriorityIcon({
  priority,
  className,
}: {
  priority: BacklogPriority;
  className?: string;
}) {
  const filled = PRIORITY_BAR_COUNT[priority];
  const label = `Priorité ${backlogPriorityLabels[priority].toLowerCase()}`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-3 shrink-0 items-end gap-px",
        backlogPriorityTextClasses[priority],
        className
      )}
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn("w-[3px] rounded-[1px] bg-current", bar > filled && "opacity-25")}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </span>
  );
}

interface BacklogTaskCardProps {
  task: BacklogTaskCardData;
  labelsById: Map<string, BacklogLabelRef>;
  usersById: Map<string, BacklogUserRef>;
  onOpen?: (taskId: string) => void;
  isOverlay?: boolean;
  className?: string;
}

export function BacklogTaskCardView({
  task,
  labelsById,
  usersById,
  onOpen,
  isOverlay,
  className,
}: BacklogTaskCardProps) {
  const labels = task.labelIds.flatMap((id) => labelsById.get(id) ?? []);
  const assignee = task.assigneeId ? usersById.get(task.assigneeId) : undefined;
  const dueState = getBacklogDueState(task.dueDate, task.status);
  const hasMeta =
    task.dueDate || task.checklistTotal > 0 || task.hasDescription || task.ticket || assignee;

  return (
    <div
      className={cn(
        "bg-card border-border flex flex-col gap-2 rounded-md border p-2.5 text-left shadow-xs transition-colors",
        isOverlay
          ? "ring-primary/40 rotate-2 cursor-grabbing shadow-lg ring-1"
          : "hover:border-ring/50",
        className
      )}
    >
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <BacklogLabelChip key={label.id} label={label} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <BacklogPriorityIcon priority={task.priority} className="mt-1" />
        {onOpen ? (
          <button
            type="button"
            onClick={(e) => {
              // La carte déplaçable ouvre déjà la tâche au clic.
              e.stopPropagation();
              onOpen(task.id);
            }}
            className="focus-visible:ring-ring/40 min-w-0 flex-1 cursor-pointer rounded-sm text-left text-sm leading-snug font-medium break-words outline-none focus-visible:ring-2"
          >
            {task.title}
          </button>
        ) : (
          <span className="min-w-0 flex-1 text-sm leading-snug font-medium break-words">
            {task.title}
          </span>
        )}
      </div>

      {hasMeta && (
        <div className="text-muted-foreground flex items-center gap-2.5 text-xs">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                dueState === "overdue" && "font-medium text-red-600 dark:text-red-400",
                dueState === "soon" && "font-medium text-amber-600 dark:text-amber-400"
              )}
              title={dueState === "overdue" ? "Échéance dépassée" : "Échéance"}
            >
              <CalendarBlank className="size-3.5" />
              {formatDate(task.dueDate, { style: "compact", withTime: false })}
            </span>
          )}
          {task.checklistTotal > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                task.checklistDone === task.checklistTotal &&
                  "text-emerald-600 dark:text-emerald-400"
              )}
              title="Checklist"
            >
              <CheckSquare className="size-3.5" />
              {task.checklistDone}/{task.checklistTotal}
            </span>
          )}
          {task.hasDescription && (
            <span title="Cette tâche a une description">
              <TextAlignLeft className="size-3.5" />
            </span>
          )}
          {task.ticket && (
            <span title={`Ticket lié : ${task.ticket.subject}`}>
              <Ticket className="size-3.5" />
            </span>
          )}
          {assignee && <BacklogUserAvatar user={assignee} className="ml-auto size-5" />}
        </div>
      )}
    </div>
  );
}

export function SortableBacklogTaskCard(props: Omit<BacklogTaskCardProps, "isOverlay">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("cursor-grab touch-manipulation outline-none", isDragging && "opacity-40")}
      onClick={() => props.onOpen?.(props.task.id)}
      {...attributes}
      {...listeners}
    >
      <BacklogTaskCardView {...props} />
    </div>
  );
}
