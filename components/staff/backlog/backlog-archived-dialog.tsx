"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive } from "@phosphor-icons/react";

import { getArchivedBacklogTasksAction } from "@/lib/actions/backlog-actions";
import type { BacklogLabelRef, BacklogTaskCard, BacklogUserRef } from "@/lib/backlog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BacklogTaskCardView } from "./backlog-task-card";

interface BacklogArchivedDialogProps {
  labelsById: Map<string, BacklogLabelRef>;
  usersById: Map<string, BacklogUserRef>;
  onOpenTask: (taskId: string) => void;
}

export function BacklogArchivedDialog({
  labelsById,
  usersById,
  onOpenTask,
}: BacklogArchivedDialogProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<BacklogTaskCard[] | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setTasks(null);
    getArchivedBacklogTasksAction().then((res) => {
      if (!res.success || !res.data) {
        toast.error(res.error || "Impossible de charger les tâches archivées.");
        setOpen(false);
        return;
      }
      setTasks(res.data);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(true)}>
        <Archive />
        Archives
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tâches archivées</DialogTitle>
            <DialogDescription>
              Ouvrez une tâche pour la consulter ou la restaurer dans le tableau.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {tasks === null ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : tasks.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Aucune tâche archivée.
              </p>
            ) : (
              tasks.map((task) => (
                <BacklogTaskCardView
                  key={task.id}
                  task={task}
                  labelsById={labelsById}
                  usersById={usersById}
                  onOpen={(taskId) => {
                    setOpen(false);
                    onOpenTask(taskId);
                  }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
