"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addMemberToGroupAction } from "@/lib/actions/rp-group-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerSelect, type PlayerOption } from "@/components/player-select";

interface AddGroupMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  availablePlayers: PlayerOption[];
}

export function AddGroupMemberDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  availablePlayers,
}: AddGroupMemberDialogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayerId) {
      toast.error("Veuillez sélectionner un joueur.");
      return;
    }

    startTransition(async () => {
      const res = await addMemberToGroupAction(groupId, selectedPlayerId);

      if (!res.success) {
        toast.error(res.error || "Erreur lors de l'ajout du joueur.");
        return;
      }

      toast.success("Le joueur a été ajouté au groupe.");
      setSelectedPlayerId(null);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Ajouter un membre à {groupName}</DialogTitle>
          </DialogHeader>

          <PlayerSelect
            players={availablePlayers}
            value={selectedPlayerId}
            onChange={(id) => setSelectedPlayerId(id)}
            placeholder="Sélectionner un joueur..."
            emptyText="Aucun joueur éligible"
            searchPlaceholder="Rechercher par pseudo ou nom RP..."
            disabled={isPending}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !selectedPlayerId}>
              {isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
