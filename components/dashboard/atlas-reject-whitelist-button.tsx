"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle } from "@phosphor-icons/react";

import { rejectWhitelistPlayer } from "@/lib/actions/staff-review-actions";
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

export interface AtlasRejectWhitelistButtonProps {
  playerId: string;
  pseudo: string;
}

export function AtlasRejectWhitelistButton({ playerId, pseudo }: AtlasRejectWhitelistButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await rejectWhitelistPlayer(playerId);
        if (res.discordSanctionApplied) {
          toast.success(
            `${pseudo} a été refusé de la whitelist. Rôles Discord retirés et rôle d'exclusion attribué.`
          );
        } else if (res.discordError) {
          toast.warning(
            `${pseudo} a été refusé en base, mais une erreur est survenue sur Discord : ${res.discordError}`
          );
        } else {
          toast.success(`${pseudo} a été refusé de la whitelist.`);
        }
        setOpen(false);
        router.push("/staff/atlas");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue lors du refus."
        );
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        Refuser
      </Button>

      <AlertDialog open={open} onOpenChange={(val) => !isPending && setOpen(val)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la whitelist du joueur</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Refuser <strong className="text-foreground"> {pseudo} </strong>
                de la whitelist ? Sa fiche personnage restera enregistrée.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={isPending}
            >
              {isPending ? "Refus en cours..." : "Confirmer le refus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
