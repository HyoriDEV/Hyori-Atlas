"use client";

import { useState, useTransition } from "react";

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
    const action = pendingAction === "accept" ? acceptWaitlistPlayer : rejectWaitlistPlayer;
    startTransition(async () => {
      await action(userId);
      setPendingAction(null);
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
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Accepter la demande d&apos;inscription de {pseudo} ?
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

      <AlertDialog
        open={pendingAction === "reject"}
        onOpenChange={(open) => setPendingAction(open ? "reject" : null)}
      >
        <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
          Refuser
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Refuser la demande d&apos;inscription de {pseudo} ?
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
    </div>
  );
}
