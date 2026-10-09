"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowCounterClockwise,
  DotsThreeVertical,
  Envelope,
  EnvelopeOpen,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  archiveTicket,
  deleteTicket,
  reopenTicket,
  setStaffTicketRead,
} from "@/lib/actions/ticket-actions";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function TicketRowActions({
  ticketId,
  status,
  isUnread,
  isAdmin = false,
}: {
  ticketId: string;
  status: TicketStatus;
  isUnread: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === TicketStatus.ARCHIVED;

  function handleToggleRead() {
    startTransition(async () => {
      try {
        const result = await setStaffTicketRead(ticketId, isUnread);
        if (!result.success) {
          toast.error(result.error ?? "Une erreur est survenue.");
          return;
        }
        router.refresh();
      } catch {
        toast.error("Une erreur est survenue.");
      }
    });
  }

  function handleConfirmStatus() {
    startTransition(async () => {
      try {
        await (isArchived ? reopenTicket(ticketId) : archiveTicket(ticketId));
        toast.success(isArchived ? "Ticket rouvert." : "Ticket archivé.");
        setConfirmOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      try {
        await deleteTicket(ticketId);
        toast.success("Ticket supprimé définitivement.");
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    // Les menus et dialogues sont rendus dans un portail : sans cet arrêt, leurs clics
    // remonteraient jusqu'à la ligne du tableau et ouvriraient le ticket.
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              title="Actions du ticket"
              disabled={isPending}
            />
          }
        >
          <DotsThreeVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {!isArchived && (
            <DropdownMenuItem onClick={handleToggleRead}>
              {isUnread ? <EnvelopeOpen className="size-3.5" /> : <Envelope className="size-3.5" />}
              <span>{isUnread ? "Marquer comme lu" : "Marquer comme non lu"}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
            {isArchived ? (
              <ArrowCounterClockwise className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            <span>{isArchived ? "Désarchiver" : "Archiver"}</span>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash className="size-3.5" />
                <span>Supprimer définitivement</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              onClick={handleConfirmStatus}
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
                onClick={handleConfirmDelete}
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
