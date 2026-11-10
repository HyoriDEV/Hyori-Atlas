"use client";

import { useTransition } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";
import { toast } from "sonner";

import { toggleTicketSecrecy } from "@/lib/actions/ticket-actions";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TicketSecrecyButton({
  ticketId,
  isSecret,
}: {
  ticketId: string;
  isSecret: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const result = await toggleTicketSecrecy(ticketId);
        if (!result.success) {
          toast.error(result.error || "Une erreur est survenue.");
          return;
        }
        if (result.isSecret) {
          toast.success("Ticket qualifié en spoiler/confidentiel (réservé Admin + Suivi RP).");
        } else {
          toast.success("Qualification spoiler retirée (accessible aux rôles de la catégorie).");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            className={
              isSecret
                ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }
          >
            {isSecret ? (
              <>
                <Lock className="size-3.5" />
                <span>Spoiler RP</span>
              </>
            ) : (
              <>
                <LockOpen className="size-3.5 text-emerald-500" />
                <span>Standard</span>
              </>
            )}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSecret
              ? "Retirer la qualification de spoiler ?"
              : "Marquer ce ticket comme spoiler RP ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSecret
              ? "Le ticket sera rendu accessible à l'ensemble des membres habilités pour cette catégorie."
              : "Le ticket sera restreint exclusivement aux administrateurs, à l'équipe Suivi RP et aux membres spécifiquement convoqués."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle} disabled={isPending}>
            {isSecret ? "Retirer le spoiler" : "Marquer comme spoiler"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
