"use client";

import { useState, useTransition } from "react";

import {
  promoteToWhitelisted,
  requestCharacterSheetChanges,
  validateCharacterSheet,
} from "@/lib/actions/staff-review-actions";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
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

type PendingAction = "validate" | "request-changes" | "promote" | null;

export function AtlasReviewPanel({
  playerId,
  pseudo,
  sheetId,
  reviewStatus,
  registrationStatus,
}: {
  playerId: string;
  pseudo: string;
  sheetId: string | null;
  reviewStatus: CharacterSheetStatus | null;
  registrationStatus: RegistrationStatus;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  const canValidate = Boolean(sheetId) && reviewStatus !== CharacterSheetStatus.VALIDATED;
  const canRequestChanges = Boolean(sheetId);
  const canPromote =
    reviewStatus === CharacterSheetStatus.VALIDATED &&
    registrationStatus !== RegistrationStatus.WHITELISTED;

  function handleConfirm() {
    if (!pendingAction) return;
    startTransition(async () => {
      if (pendingAction === "validate" && sheetId) {
        await validateCharacterSheet(sheetId);
      } else if (pendingAction === "request-changes" && sheetId) {
        await requestCharacterSheetChanges(sheetId);
      } else if (pendingAction === "promote") {
        await promoteToWhitelisted(playerId);
      }
      setPendingAction(null);
    });
  }

  const dialogCopy: Record<
    Exclude<PendingAction, null>,
    { title: string; description: string }
  > = {
    validate: {
      title: "Valider la fiche personnage",
      description: `La fiche de ${pseudo} sera verrouillée et ne pourra plus être modifiée.`,
    },
    "request-changes": {
      title: "Demander des modifications",
      description: `${pseudo} devra modifier sa fiche et réserver un nouveau créneau d'entretien.`,
    },
    promote: {
      title: "Promouvoir en Inscrit",
      description: `${pseudo} sera inscrit à la whitelist et débloquera l'Écriture et le Suivi RP.`,
    },
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={!canRequestChanges}
        onClick={() => setPendingAction("request-changes")}
      >
        Demander des modifications
      </Button>
      <Button type="button" disabled={!canValidate} onClick={() => setPendingAction("validate")}>
        Marquer comme validée
      </Button>
      <Button type="button" disabled={!canPromote} onClick={() => setPendingAction("promote")}>
        Promouvoir en Inscrit
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
