"use client";

import { useState, useTransition } from "react";

import { archiveTicket, reopenTicket } from "@/lib/actions/ticket-actions";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TicketStatusActions({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === TicketStatus.ARCHIVED;

  function handleConfirm() {
    startTransition(async () => {
      await (isArchived ? reopenTicket(ticketId) : archiveTicket(ticketId));
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {isArchived ? "Désarchiver" : "Archiver"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? "Désarchiver le ticket" : "Archiver le ticket"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "Le ticket repassera au statut « En attente du staff » et redeviendra modifiable."
                : "Le ticket ne sera plus modifiable par le joueur, mais restera consultable par tous."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
