"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptWaitlistPlayer, rejectWaitlistPlayer } from "@/lib/actions/waitlist-actions";
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

type PendingAction = "accept" | "reject" | null;

export function WaitlistRowActions({ userId, pseudo }: { userId: string; pseudo: string }) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!pendingAction) return;
    const isAccept = pendingAction === "accept";
    const action = isAccept ? acceptWaitlistPlayer : rejectWaitlistPlayer;
    startTransition(async () => {
      try {
        await action(userId);
        if (isAccept) {
          toast.success(`Demande de ${pseudo} acceptée.`);
        } else {
          toast.warning(`Demande de ${pseudo} refusée.`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <AlertDialog
        open={pendingAction === "accept"}
        onOpenChange={(open) => setPendingAction(open ? "accept" : null)}
      >
        <AlertDialogTrigger render={<Button size="sm" />}>Accepter</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accepter l&apos;inscription</AlertDialogTitle>
            <AlertDialogDescription>
              Accepter la demande d&apos;inscription de {pseudo} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              Accepter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAction === "reject"}
        onOpenChange={(open) => setPendingAction(open ? "reject" : null)}
      >
        <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
          Refuser
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser l&apos;inscription</AlertDialogTitle>
            <AlertDialogDescription>
              Refuser la demande d&apos;inscription de {pseudo} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={isPending}>
              Refuser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
