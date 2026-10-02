"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { toggleTicketRpTrackingAccess } from "@/lib/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function TicketRpAccessButton({
  ticketId,
  rpTrackingAccess,
  isAdmin,
}: {
  ticketId: string;
  rpTrackingAccess: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) {
    if (!rpTrackingAccess) return null;
    return <Badge variant="secondary">Suivi RP</Badge>;
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await toggleTicketRpTrackingAccess(ticketId);
        if (!result.success && result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(
          result.rpTrackingAccess
            ? "Équipe de Suivi RP convoquée sur le ticket."
            : "Accès de l'équipe Suivi RP révoqué."
        );
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={rpTrackingAccess ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        title={
          rpTrackingAccess
            ? "Cliquer pour révoquer l'accès Suivi RP"
            : "Convoquer l'équipe de Suivi RP sur ce ticket"
        }
      >
        {rpTrackingAccess ? <span>Suivi RP</span> : <span>Convoquer Suivi RP</span>}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rpTrackingAccess ? "Révoquer l'accès Suivi RP" : "Convoquer l'équipe Suivi RP"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rpTrackingAccess
                ? "Retirer l'accès des membres du Suivi RP à ce ticket ?"
                : "Rendre ce ticket accessible aux membres de l'équipe Suivi RP ?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant={rpTrackingAccess ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {rpTrackingAccess ? "Révoquer l'accès" : "Convoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
