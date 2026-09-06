"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserMinus } from "@phosphor-icons/react";

import { Role } from "@/lib/generated/prisma/enums";
import { updateUserRoleAction } from "@/lib/actions/staff-team-actions";
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

interface RemoveStaffMemberButtonProps {
  userId: string;
  userName: string;
  isCurrentAdmin: boolean;
}

export function RemoveStaffMemberButton({
  userId,
  userName,
  isCurrentAdmin,
}: RemoveStaffMemberButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirmRemove() {
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, Role.PLAYER);
        toast.success(`${userName} a été retiré de l'équipe staff.`);
        setIsOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur lors du retrait du membre.");
      }
    });
  }

  if (isCurrentAdmin) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="text-muted-foreground/40 h-8 gap-1 px-2.5 text-xs"
        title="Vous ne pouvez pas vous retirer vous-même de l'équipe staff."
      >
        <UserMinus className="size-3.5" />
        Retirer
      </Button>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 gap-1 px-2.5 text-xs"
          />
        }
      >
        <UserMinus className="size-3.5" />
        Retirer
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer le membre de l&apos;équipe</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir retirer <strong className="text-foreground">{userName}</strong>{" "}
            de l&apos;équipe du staff ?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border p-3 text-xs">
          L&apos;utilisateur sera rétrogradé au rôle <strong>Joueur</strong> et n&apos;aura plus
          accès à l&apos;espace staff ni aux outils de modération et de gestion.
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirmRemove}
            disabled={isPending}
          >
            {isPending ? "Retrait en cours..." : "Confirmer le retrait"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
