"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
      try {
        await (isArchived ? reopenTicket(ticketId) : archiveTicket(ticketId));
        toast.success(isArchived ? "Ticket rouvert." : "Ticket archivé.");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
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
                ? "Le ticket redeviendra modifiable."
                : "Le ticket ne sera plus modifiable par le joueur, mais restera consultable par tous ses membres."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isArchived ? "Désarchiver" : "Archiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
