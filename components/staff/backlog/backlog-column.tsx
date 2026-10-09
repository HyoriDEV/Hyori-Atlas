"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import {
  backlogStatusDotClasses,
  backlogStatusLabels,
  type BacklogLabelRef,
  type BacklogTaskCard,
  type BacklogUserRef,
} from "@/lib/backlog";
import type { BacklogStatus } from "@/lib/generated/prisma/enums";
import { BacklogQuickAdd } from "./backlog-quick-add";
import { SortableBacklogTaskCard } from "./backlog-task-card";

interface BacklogColumnProps {
  status: BacklogStatus;
  tasks: BacklogTaskCard[];
  labelsById: Map<string, BacklogLabelRef>;
  usersById: Map<string, BacklogUserRef>;
  footerNote?: string;
  onOpenTask: (taskId: string) => void;
  onTaskCreated: (task: BacklogTaskCard) => void;
}

export function BacklogColumn({
  status,
  tasks,
  labelsById,
  usersById,
  footerNote,
  onOpenTask,
  onTaskCreated,
}: BacklogColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={backlogStatusLabels[status]}
      className="bg-muted/40 flex max-h-full w-72 shrink-0 flex-col rounded-lg"
    >
      <header className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn("size-2 rounded-full", backlogStatusDotClasses[status])} />
        <h2 className="font-heading text-sm font-semibold">{backlogStatusLabels[status]}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{tasks.length}</span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto rounded-md px-2 pb-1 transition-colors",
          isOver && tasks.length === 0 && "bg-primary/5"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableBacklogTaskCard
              key={task.id}
              task={task}
              labelsById={labelsById}
              usersById={usersById}
              onOpen={onOpenTask}
            />
          ))}
        </SortableContext>
        {footerNote && (
          <p className="text-muted-foreground px-1 py-1 text-center text-xs">{footerNote}</p>
        )}
      </div>

      <div className="shrink-0 p-2">
        <BacklogQuickAdd status={status} onCreated={onTaskCreated} />
      </div>
    </section>
  );
}
