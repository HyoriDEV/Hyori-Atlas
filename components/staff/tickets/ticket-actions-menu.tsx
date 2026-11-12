"use client";

import { useState } from "react";
import { ArrowSquareOut, CaretDown, DiscordLogo, Hash, Kanban, Plus } from "@phosphor-icons/react";

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

export interface SerializedStaffTopic {
  id: string;
  slug: string;
  channelUrl: string | null;
  isArchived: boolean;
}

interface TicketActionsMenuProps {
  ticketId: string;
  ticketSubject: string;
  canUseBacklog: boolean;
  backlogAssignees: BacklogUserRef[];
  topics?: SerializedStaffTopic[];
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
  topics = [],
}: TicketActionsMenuProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  const activeTopic = topics.find((t) => !t.isArchived);

  return (
    <div className="flex items-center gap-2">
      {/* Raccourci vers le salon Discord si un sujet actif est associé au ticket */}
      {activeTopic?.channelUrl && (
        <Button
          variant="outline"
          size="sm"
          render={
            <a
              href={activeTopic.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Ouvrir le salon de discussion Discord"
            />
          }
          className="text-muted-foreground hover:text-foreground gap-1.5 border-[#5865F2]/30 text-xs hover:border-[#5865F2]"
        >
          <DiscordLogo className="size-3.5 text-[#5865F2]" />
          <span className="font-mono">#{activeTopic.slug}</span>
          <ArrowSquareOut className="size-3 opacity-60" />
        </Button>
      )}

      {/* Menu déroulant unifié Créer... */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1.5">
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
    </div>
  );
}
