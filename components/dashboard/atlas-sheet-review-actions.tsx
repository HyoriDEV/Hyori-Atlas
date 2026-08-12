"use client";

import { useState, useTransition } from "react";

import {
  requestCharacterSheetChanges,
  validateCharacterSheet,
} from "@/lib/actions/staff-review-actions";
import { CharacterSheetStatus } from "@/lib/generated/prisma/enums";
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

type PendingAction = "validate" | "request-changes" | null;

export function AtlasSheetReviewActions({
  sheetId,
  pseudo,
  reviewStatus,
}: {
  sheetId: string;
  pseudo: string;
  reviewStatus: CharacterSheetStatus;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  const canValidate = reviewStatus !== CharacterSheetStatus.VALIDATED;

  function handleConfirm() {
    if (!pendingAction) return;
    startTransition(async () => {
      if (pendingAction === "validate") {
        await validateCharacterSheet(sheetId);
      } else {
        await requestCharacterSheetChanges(sheetId);
      }
      setPendingAction(null);
    });
  }

  const dialogCopy: Record<Exclude<PendingAction, null>, { title: string; description: string }> = {
    validate: {
      title: "Valider la fiche personnage",
      description: `La fiche de ${pseudo} sera verrouillée et ne pourra plus être modifiée.`,
    },
    "request-changes": {
      title: "Demander des modifications",
      description: `${pseudo} devra modifier sa fiche et réserver un nouveau créneau d'entretien.`,
    },
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPendingAction("request-changes")}
      >
        Demander des modifications
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!canValidate}
        onClick={() => setPendingAction("validate")}
      >
        Marquer comme validée
      </Button>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          {pendingAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogCopy[pendingAction].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {dialogCopy[pendingAction].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
