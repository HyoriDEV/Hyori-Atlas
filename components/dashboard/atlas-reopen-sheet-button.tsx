"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reopenCharacterSheetReview } from "@/lib/actions/staff-review-actions";
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

export function AtlasReopenSheetButton({ sheetId, pseudo }: { sheetId: string; pseudo: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await reopenCharacterSheetReview(sheetId);
        toast.success(`Fiche personnage de ${pseudo} rouverte.`);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Rouvrir la fiche
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rouvrir la fiche personnage</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche de <span className="text-foreground">{pseudo} </span>repassera au statut « À
              évaluer (staff) ». Le staff pourra à nouveau l&apos;évaluer et demander des
              modifications si nécessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              Rouvrir la fiche
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
