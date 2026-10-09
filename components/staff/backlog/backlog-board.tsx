"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Archive } from "@phosphor-icons/react";

import {
  archiveDoneBacklogTasksAction,
  moveBacklogTaskAction,
} from "@/lib/actions/backlog-actions";
import {
  backlogStatusOrder,
  positionBetween,
  type BacklogLabelRef,
  type BacklogTaskCard,
  type BacklogTaskDetail,
  type BacklogUserRef,
} from "@/lib/backlog";
import { BacklogStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { BacklogArchivedDialog } from "./backlog-archived-dialog";
import { BacklogColumn } from "./backlog-column";
import {
  BacklogFilters,
  emptyBacklogFilters,
  hasActiveBacklogFilters,
  matchesBacklogFilters,
  type BacklogFilterState,
} from "./backlog-filters";
import { BacklogTaskCardView } from "./backlog-task-card";
import { BacklogTaskSheet } from "./backlog-task-sheet";

const TASK_PARAM = "task";

interface BacklogBoardProps {
  initialTasks: BacklogTaskCard[];
  initialLabels: BacklogLabelRef[];
  users: BacklogUserRef[];
  currentUserId: string;
  canManage: boolean;
  /** Tâches terminées non archivées au-delà de la limite d'affichage de la colonne. */
  hiddenDoneCount: number;
}

function isBacklogStatus(value: unknown): value is BacklogStatus {
  return typeof value === "string" && value in BacklogStatus;
}

/** La colonne « Terminé » est triée par date de fin ; les autres suivent l'ordre manuel. */
function sortColumn(status: BacklogStatus, tasks: BacklogTaskCard[]): BacklogTaskCard[] {
  return [...tasks].sort((a, b) =>
    status === BacklogStatus.DONE
      ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      : a.position - b.position
  );
}

function toCard(detail: BacklogTaskDetail): BacklogTaskCard {
  return {
    id: detail.id,
    title: detail.title,
    status: detail.status,
    priority: detail.priority,
    position: detail.position,
    dueDate: detail.dueDate,
    completedAt: detail.completedAt,
    archivedAt: detail.archivedAt,
    assigneeId: detail.assigneeId,
    createdById: detail.createdById,
    labelIds: detail.labelIds,
    checklistDone: detail.checklistDone,
    checklistTotal: detail.checklistTotal,
    hasDescription: detail.hasDescription,
    ticket: detail.ticket,
  };
}

export function BacklogBoard({
  initialTasks,
  initialLabels,
  users,
  currentUserId,
  canManage,
  hiddenDoneCount,
}: BacklogBoardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get(TASK_PARAM);

  const [tasks, setTasks] = useState(initialTasks);
  const [syncedTasks, setSyncedTasks] = useState(initialTasks);
  const [labels, setLabels] = useState(initialLabels);
  const [syncedLabels, setSyncedLabels] = useState(initialLabels);
  const [filters, setFilters] = useState<BacklogFilterState>(emptyBacklogFilters);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragSnapshot, setDragSnapshot] = useState<BacklogTaskCard[] | null>(null);
  const [isArchiving, startArchiving] = useTransition();

  // Les données du serveur remplacent l'état local, sauf pendant un glisser-déposer.
  if (initialTasks !== syncedTasks && activeId === null) {
    setSyncedTasks(initialTasks);
    setTasks(initialTasks);
  }
  if (initialLabels !== syncedLabels) {
    setSyncedLabels(initialLabels);
    setLabels(initialLabels);
  }

  const labelsById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const assignableUsers = useMemo(() => users.filter((u) => u.assignable), [users]);

  const columns = useMemo(() => {
    const visible = tasks.filter((task) => matchesBacklogFilters(task, filters, currentUserId));
    return new Map(
      backlogStatusOrder.map((status) => [
        status,
        sortColumn(
          status,
          visible.filter((task) => task.status === status)
        ),
      ])
    );
  }, [tasks, filters, currentUserId]);

  const sensors = useSensors(
    // Le seuil de déplacement laisse passer le simple clic, qui ouvre la tâche.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const openTask = useCallback(
    (taskId: string) => {
      window.history.pushState(null, "", `${pathname}?${TASK_PARAM}=${taskId}`);
    },
    [pathname]
  );

  const closeTask = useCallback(() => {
    window.history.pushState(null, "", pathname);
  }, [pathname]);

  const upsertTask = useCallback((task: BacklogTaskCard) => {
    setTasks((prev) => {
      if (task.archivedAt) {
        return prev.filter((t) => t.id !== task.id);
      }
      return prev.some((t) => t.id === task.id)
        ? prev.map((t) => (t.id === task.id ? task : t))
        : [...prev, task];
    });
  }, []);

  const handleTaskChange = useCallback(
    (detail: BacklogTaskDetail) => upsertTask(toCard(detail)),
    [upsertTask]
  );

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleLabelSaved = useCallback((label: BacklogLabelRef) => {
    setLabels((prev) =>
      (prev.some((l) => l.id === label.id)
        ? prev.map((l) => (l.id === label.id ? label : l))
        : [...prev, label]
      ).sort((a, b) => a.name.localeCompare(b.name, "fr"))
    );
  }, []);

  const handleLabelDeleted = useCallback((labelId: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    setTasks((prev) =>
      prev.map((t) =>
        t.labelIds.includes(labelId)
          ? { ...t, labelIds: t.labelIds.filter((id) => id !== labelId) }
          : t
      )
    );
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDragSnapshot(tasks);
  }

  // Au survol d'une autre colonne, la carte y est déplacée tout de suite pour prévisualiser le dépôt.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overStatus = isBacklogStatus(over.id)
      ? over.id
      : tasks.find((t) => t.id === over.id)?.status;
    if (!overStatus || overStatus === activeTask.status) return;

    const column = (columns.get(overStatus) ?? []).filter((t) => t.id !== activeTask.id);
    let index = column.length;
    if (!isBacklogStatus(over.id)) {
      const overIndex = column.findIndex((t) => t.id === over.id);
      const translated = active.rect.current.translated;
      const isBelowOver = translated
        ? translated.top > over.rect.top + over.rect.height / 2
        : false;
      index = overIndex < 0 ? column.length : overIndex + (isBelowOver ? 1 : 0);
    }

    const position = positionBetween(
      column[index - 1]?.position ?? null,
      column[index]?.position ?? null
    );

    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTask.id
          ? {
              ...t,
              status: overStatus,
              position,
              completedAt: overStatus === BacklogStatus.DONE ? new Date().toISOString() : null,
            }
          : t
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const snapshot = dragSnapshot;
    setActiveId(null);
    setDragSnapshot(null);

    const activeTask = tasks.find((t) => t.id === active.id);
    const original = snapshot?.find((t) => t.id === active.id);
    if (!activeTask || !original || !snapshot) return;

    if (!over) {
      setTasks(snapshot);
      return;
    }

    let position = activeTask.position;
    const column = columns.get(activeTask.status) ?? [];
    const isReorder =
      activeTask.status !== BacklogStatus.DONE &&
      !isBacklogStatus(over.id) &&
      over.id !== active.id &&
      column.some((t) => t.id === over.id);

    if (isReorder) {
      const oldIndex = column.findIndex((t) => t.id === active.id);
      const newIndex = column.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(column, oldIndex, newIndex);
      position = positionBetween(
        reordered[newIndex - 1]?.position ?? null,
        reordered[newIndex + 1]?.position ?? null
      );
      setTasks((prev) => prev.map((t) => (t.id === activeTask.id ? { ...t, position } : t)));
    }

    if (activeTask.status === original.status && position === original.position) {
      return;
    }

    moveBacklogTaskAction(activeTask.id, activeTask.status, position).then((res) => {
      if (!res.success) {
        toast.error(res.error || "Le déplacement n'a pas pu être enregistré.");
        setTasks(snapshot);
      }
    });
  }

  function handleDragCancel() {
    if (dragSnapshot) setTasks(dragSnapshot);
    setActiveId(null);
    setDragSnapshot(null);
  }

  function handleArchiveDone() {
    startArchiving(async () => {
      const res = await archiveDoneBacklogTasksAction();
      if (!res.success || !res.data) {
        toast.error(res.error || "Erreur lors de l'archivage.");
        return;
      }
      setTasks((prev) => prev.filter((t) => t.status !== BacklogStatus.DONE));
      toast.success(
        res.data.count > 1
          ? `${res.data.count} tâches terminées ont été archivées.`
          : "La tâche terminée a été archivée."
      );
    });
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;
  const doneCount = tasks.filter((t) => t.status === BacklogStatus.DONE).length;
  const isFiltered = hasActiveBacklogFilters(filters);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Backlog</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Suivez les bugs à corriger et les fonctionnalités à venir, de leur signalement à leur
            livraison.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BacklogArchivedDialog
            labelsById={labelsById}
            usersById={usersById}
            onOpenTask={openTask}
          />
          {canManage && (
            <Button
              type="button"
              variant="outline"
              onClick={handleArchiveDone}
              disabled={isArchiving || doneCount === 0}
              title="Retire du tableau toutes les tâches de la colonne « Terminé »"
            >
              <Archive />
              Archiver les tâches terminées
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <BacklogFilters
          filters={filters}
          users={assignableUsers}
          labels={labels}
          onChange={setFilters}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-2">
          {backlogStatusOrder.map((status) => (
            <BacklogColumn
              key={status}
              status={status}
              tasks={columns.get(status) ?? []}
              labelsById={labelsById}
              usersById={usersById}
              footerNote={
                status === BacklogStatus.DONE && hiddenDoneCount > 0 && !isFiltered
                  ? `+ ${hiddenDoneCount} plus ancienne${hiddenDoneCount > 1 ? "s" : ""}, à archiver`
                  : undefined
              }
              onOpenTask={openTask}
              onTaskCreated={upsertTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <BacklogTaskCardView
              task={activeTask}
              labelsById={labelsById}
              usersById={usersById}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      <BacklogTaskSheet
        taskId={selectedTaskId}
        users={users}
        labels={labels}
        currentUserId={currentUserId}
        canManage={canManage}
        onClose={closeTask}
        onTaskChange={handleTaskChange}
        onTaskDeleted={handleTaskDeleted}
        onLabelSaved={handleLabelSaved}
        onLabelDeleted={handleLabelDeleted}
      />
    </div>
  );
}
