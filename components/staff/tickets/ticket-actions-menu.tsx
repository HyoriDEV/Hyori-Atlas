"use client";

import { useState } from "react";
import { CaretDown, Hash, Kanban, Plus } from "@phosphor-icons/react";

import type { BacklogUserRef } from "@/lib/backlog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTaskFromTicketDialog } from "@/components/staff/backlog/create-task-from-ticket-dialog";
import { CreateStaffTopicDialog } from "@/components/staff/topics/create-staff-topic-dialog";

interface TicketActionsMenuProps {
  ticketId: string;
  ticketSubject: string;
  canUseBacklog: boolean;
  backlogAssignees: BacklogUserRef[];
}

/**
 * Menu d'actions unifié regroupant "Créer une tâche" et "Créer un sujet"
 * pour éviter d'encombrer l'en-tête de la page de ticket.
 */
export function TicketActionsMenu({
  ticketId,
  ticketSubject,
  canUseBacklog,
  backlogAssignees,
}: TicketActionsMenuProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  return (
    <>
      {/* Menu déroulant unifié Créer... */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="default"
              className="h-8 gap-1.5 px-3 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Créer</span>
              <CaretDown className="size-3 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {canUseBacklog && (
            <DropdownMenuItem
              onClick={() => setTaskDialogOpen(true)}
              className="cursor-pointer gap-2"
            >
              <Kanban className="text-primary size-4" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Créer une tâche</span>
                <span className="text-muted-foreground text-[10px]">Tâche liée au backlog</span>
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setTopicDialogOpen(true)}
            className="cursor-pointer gap-2"
          >
            <Hash className="size-4 text-[#5865F2]" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Créer un sujet Discord</span>
              <span className="text-muted-foreground text-[10px]">
                Salon de discussion d&apos;équipe
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modale tâche backlog */}
      {canUseBacklog && (
        <CreateTaskFromTicketDialog
          ticketId={ticketId}
          ticketSubject={ticketSubject}
          assignees={backlogAssignees}
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          hideTrigger
        />
      )}

      {/* Modale sujet Discord */}
      <CreateStaffTopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        ticketId={ticketId}
        ticketSubject={ticketSubject}
      />
    </>
  );
}
