"use client";

import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { createCharacterForPlayer } from "@/lib/actions/staff-character-actions";
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

export function AtlasCreateCharacterDialog({
  playerId,
  pseudo,
}: {
  playerId: string;
  pseudo: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      try {
        await createCharacterForPlayer(playerId);
        toast.success(`Nouveau personnage créé pour ${pseudo}.`);
        setOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Une erreur est survenue.";
        toast.error(message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5 text-xs font-medium shadow-xs">
            <Plus className="size-3.5" />
            <span>Nouveau personnage</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ajouter un nouveau personnage</AlertDialogTitle>
          <AlertDialogDescription>
            Un nouveau personnage avec une fiche vierge va être accordé à <strong className="text-foreground">{pseudo}</strong>.
            Le joueur pourra immédiatement commencer la rédaction de sa nouvelle fiche.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreate} disabled={isPending}>
            {isPending ? "Création en cours..." : "Créer le personnage"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
