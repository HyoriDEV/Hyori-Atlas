"use client";

import { useState, useTransition } from "react";

import { promoteToWhitelisted } from "@/lib/actions/staff-review-actions";
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

export function AtlasPromoteButton({ playerId, pseudo }: { playerId: string; pseudo: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await promoteToWhitelisted(playerId);
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Valider la whitelist
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider la whitelist du joueur</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-foreground">{pseudo} </span>sera inscrit à la whitelist et
              débloquera automatiquement l&apos;accès au serveur Minecraft.
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
