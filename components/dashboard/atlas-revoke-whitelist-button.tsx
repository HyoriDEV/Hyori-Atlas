"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { revokeWhitelist } from "@/lib/actions/whitelist-actions";
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

export function AtlasRevokeWhitelistButton({
  playerId,
  pseudo,
}: {
  playerId: string;
  pseudo: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await revokeWhitelist(playerId);
        toast.success(`${pseudo} a été retiré de la whitelist.`);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
        Retirer la WL
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer de la whitelist</AlertDialogTitle>
          <AlertDialogDescription>
            {pseudo} repassera en liste d&apos;attente. S&apos;il est connecté en jeu et absent de
            la whitelist locale du serveur, il sera expulsé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={isPending}>
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
