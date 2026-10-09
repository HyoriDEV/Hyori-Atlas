"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { archiveTicket, deleteTicket, reopenTicket } from "@/lib/actions/ticket-actions";
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
  isAdmin = false,
}: {
  ticketId: string;
  status: TicketStatus;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === TicketStatus.ARCHIVED;

  function handleConfirm() {
    startTransition(async () => {
      try {
        await (isArchived ? reopenTicket(ticketId) : archiveTicket(ticketId));
        toast.success(isArchived ? "Ticket rouvert." : "Ticket archivé.", { id: "ticket-status" });
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", {
          id: "ticket-status",
        });
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTicket(ticketId);
        toast.success("Ticket supprimé définitivement.", { id: "ticket-delete" });
        setDeleteOpen(false);
        router.push("/staff/tickets");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", {
          id: "ticket-delete",
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isArchived ? "destructive" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isArchived ? "Désarchiver" : "Archiver"}
      </Button>
      {isAdmin && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
        >
          <Trash className="size-4" />
          Supprimer
        </Button>
      )}
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
            <AlertDialogAction
              variant={isArchived ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isArchived ? "Désarchiver" : "Archiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAdmin && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement le ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le ticket, tous ses messages ainsi que les accès
                associés seront définitivement supprimés de la base de données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Suppression en cours..." : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
