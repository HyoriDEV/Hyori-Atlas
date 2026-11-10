"use client";

import { useState } from "react";
import { CaretDown, Hash, Plus, Ticket } from "@phosphor-icons/react";

import type { PlayerOption } from "@/components/player-select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewStaffTicketDialog } from "@/components/staff/tickets/new-staff-ticket-dialog";
import { CreateStaffTopicDialog } from "@/components/staff/topics/create-staff-topic-dialog";

interface TicketListCreateMenuProps {
  availablePlayers: PlayerOption[];
  canOpenTicket: boolean;
}

/**
 * Menu d'actions unifié sur la liste des tickets permettant soit d'ouvrir un ticket joueur,
 * soit de créer un sujet Discord à partir de rien dans la catégorie Sujets.
 */
export function TicketListCreateMenu({
  availablePlayers,
  canOpenTicket,
}: TicketListCreateMenuProps) {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  // Si le staff ne peut pas ouvrir de ticket standard, afficher directement le bouton de création de sujet
  if (!canOpenTicket) {
    return (
      <>
        <Button
          type="button"
          onClick={() => setTopicDialogOpen(true)}
          className="gap-1.5"
          size="sm"
        >
          <Hash className="size-4 text-[#5865F2]" />
          <span>Nouveau sujet</span>
        </Button>

        <CreateStaffTopicDialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen} />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="gap-1.5" size="sm">
              <Plus className="size-4" />
              <span>Nouveau</span>
              <CaretDown className="size-3 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setTicketDialogOpen(true)}
            className="cursor-pointer gap-2"
          >
            <Ticket className="size-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Ouvrir un ticket</span>
              <span className="text-muted-foreground text-[10px]">Contacter un joueur</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTopicDialogOpen(true)}
            className="cursor-pointer gap-2"
          >
            <Hash className="size-4 text-[#5865F2]" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Nouveau sujet Discord</span>
              <span className="text-muted-foreground text-[10px]">
                Discussion d&apos;équipe staff
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewStaffTicketDialog
        availablePlayers={availablePlayers}
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        hideTrigger
      />

      <CreateStaffTopicDialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen} />
    </div>
  );
}
