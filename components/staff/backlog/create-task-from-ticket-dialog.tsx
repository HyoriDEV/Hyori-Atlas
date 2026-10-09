"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Kanban } from "@phosphor-icons/react";

import { createBacklogTaskAction } from "@/lib/actions/backlog-actions";
import {
  BACKLOG_TITLE_MAX_LENGTH,
  backlogPriorityLabels,
  backlogPriorityOrder,
  type BacklogUserRef,
} from "@/lib/backlog";
import { BacklogPriority } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BacklogPriorityIcon, BacklogUserAvatar } from "./backlog-task-card";

const UNASSIGNED = "NONE";

interface CreateTaskFromTicketDialogProps {
  ticketId: string;
  ticketSubject: string;
  assignees: BacklogUserRef[];
  /** Vrai si le staff peut convoquer l'équipe Dév et qu'elle ne l'est pas déjà. */
  canSummonDevelopers: boolean;
  defaultSummonDevelopers: boolean;
}

export function CreateTaskFromTicketDialog({
  ticketId,
  ticketSubject,
  assignees,
  canSummonDevelopers,
  defaultSummonDevelopers,
}: CreateTaskFromTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ticketSubject);
  const [priority, setPriority] = useState<string>(BacklogPriority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [summonDevelopers, setSummonDevelopers] = useState(defaultSummonDevelopers);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setTitle(ticketSubject);
      setPriority(BacklogPriority.MEDIUM);
      setAssigneeId(UNASSIGNED);
      setSummonDevelopers(defaultSummonDevelopers);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Le titre de la tâche est obligatoire.");
      return;
    }

    startTransition(async () => {
      const res = await createBacklogTaskAction({
        title: trimmed,
        priority,
        assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
        ticketId,
        summonDevelopers: canSummonDevelopers && summonDevelopers,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Erreur lors de la création de la tâche.");
        return;
      }

      const taskId = res.data.id;
      toast.success("La tâche a été ajoutée au backlog.", {
        action: {
          label: "Voir",
          onClick: () => router.push(`/staff/backlog?task=${taskId}`),
        },
      });
      setOpen(false);
    });
  }

  const priorityItems = backlogPriorityOrder.map((p) => ({
    value: p,
    label: backlogPriorityLabels[p],
  }));
  const assigneeItems = [
    { value: UNASSIGNED, label: "Non assignée" },
    ...assignees.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        title="Créer une tâche dans le backlog à partir de ce ticket"
      >
        <Kanban />
        <span className="hidden sm:inline">Créer une tâche</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Créer une tâche dans le backlog</DialogTitle>
              <DialogDescription>
                La tâche restera liée à ce ticket : son avancement sera visible ici.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="backlog-task-title">Titre</Label>
                <Input
                  id="backlog-task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={BACKLOG_TITLE_MAX_LENGTH}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Priorité</Label>
                  <Select
                    items={priorityItems}
                    value={priority}
                    onValueChange={(value) => value && setPriority(value)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full" aria-label="Priorité">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backlogPriorityOrder.map((p) => (
                        <SelectItem key={p} value={p}>
                          <BacklogPriorityIcon priority={p} />
                          {backlogPriorityLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Assignée à</Label>
                  <Select
                    items={assigneeItems}
                    value={assigneeId}
                    onValueChange={(value) => setAssigneeId(value ?? UNASSIGNED)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full" aria-label="Assignée à">
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
                </div>
              </div>

              {canSummonDevelopers && (
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <Checkbox
                    checked={summonDevelopers}
                    onCheckedChange={(checked) => setSummonDevelopers(checked === true)}
                    disabled={isPending}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    Convoquer l&apos;équipe Dév sur ce ticket
                    <span className="text-muted-foreground text-xs">
                      Les développeurs pourront lire le ticket et y répondre.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? "Création..." : "Créer la tâche"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
