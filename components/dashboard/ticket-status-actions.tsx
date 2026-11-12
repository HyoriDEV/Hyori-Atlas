"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowCounterClockwise,
  ArrowsClockwise,
  CaretDown,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  archiveTicket,
  deleteTicket,
  reopenTicket,
  suspendTicket,
  unsuspendTicket,
} from "@/lib/actions/ticket-actions";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export function TicketStatusActions({
  ticketId,
  status,
  isSuspended = false,
  isAdmin = false,
  className,
}: {
  ticketId: string;
  status: TicketStatus;
  isSuspended?: boolean;
  isAdmin?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === TicketStatus.ARCHIVED;

  function handleSuspend() {
    startTransition(async () => {
      try {
        await suspendTicket(ticketId);
        toast.success("Ticket mis en suspens.", { id: "ticket-status" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", {
          id: "ticket-status",
        });
      }
    });
  }

  function handleUnsuspend() {
    startTransition(async () => {
      try {
        await unsuspendTicket(ticketId);
        toast.success("Ticket rétabli.", { id: "ticket-status" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", {
          id: "ticket-status",
        });
      }
    });
  }

  function handleConfirmArchive() {
    startTransition(async () => {
      try {
        await archiveTicket(ticketId);
        toast.success("Ticket archivé.", { id: "ticket-status" });
        setArchiveOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", {
          id: "ticket-status",
        });
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      try {
        await reopenTicket(ticketId);
        toast.success("Ticket rouvert.", { id: "ticket-status" });
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="default"
              className={cn("h-8 gap-1 px-2 text-xs font-medium sm:gap-1.5 sm:px-3", className)}
              disabled={isPending}
            >
              <ArrowsClockwise className="size-3.5" />
              <span className="hidden sm:inline">Passer en</span>
              <CaretDown className="size-3 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {!isArchived && !isSuspended && (
            <DropdownMenuItem
              onClick={handleSuspend}
              disabled={isPending}
              className="cursor-pointer gap-2"
            >
              <Pause className="size-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Suspendu</span>
                <span className="text-muted-foreground text-[10px]">
                  Mettre de côté en attente
                </span>
              </div>
            </DropdownMenuItem>
          )}

          {!isArchived && isSuspended && (
            <DropdownMenuItem
              onClick={handleUnsuspend}
              disabled={isPending}
              className="cursor-pointer gap-2"
            >
              <Play className="size-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Actif</span>
                <span className="text-muted-foreground text-[10px]">
                  Reprendre le ticket dans la file
                </span>
              </div>
            </DropdownMenuItem>
          )}

          {!isArchived ? (
            <DropdownMenuItem
              onClick={() => setArchiveOpen(true)}
              disabled={isPending}
              className="cursor-pointer gap-2"
            >
              <Archive className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Archivé</span>
                <span className="text-muted-foreground text-[10px]">
                  Clore et archiver le ticket
                </span>
              </div>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleReopen}
              disabled={isPending}
              className="cursor-pointer gap-2"
            >
              <ArrowCounterClockwise className="size-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Actif</span>
                <span className="text-muted-foreground text-[10px]">
                  Rouvrir le ticket
                </span>
              </div>
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash className="size-4" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Supprimer définitivement</span>
                  <span className="text-muted-foreground text-[10px]">Action irréversible</span>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver le ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Le ticket ne sera plus modifiable par le joueur, mais restera consultable par tous
              ses membres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={handleConfirmArchive}
              disabled={isPending}
            >
              Archiver
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
              <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
                {isPending ? "Suppression en cours..." : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
