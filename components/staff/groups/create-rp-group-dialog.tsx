"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";

import { createRpGroupAction } from "@/lib/actions/rp-group-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerSelect, type PlayerOption } from "@/components/player-select";

interface CreateRpGroupDialogProps {
  availablePlayers: PlayerOption[];
  onCreated?: (groupId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateRpGroupDialog({
  availablePlayers,
  onCreated,
  trigger,
}: CreateRpGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedPlayerIds([]);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isPending) {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Le nom du groupe est obligatoire.");
      return;
    }

    startTransition(async () => {
      const res = await createRpGroupAction({
        name: trimmedName,
        description: description.trim() || undefined,
        memberIds: selectedPlayerIds,
      });

      if (!res.success) {
        toast.error(res.error || "Erreur lors de la création du groupe.");
        return;
      }

      toast.success(`Le groupe « ${trimmedName} » a été créé avec succès.`);
      onCreated?.(res.data!.id);
      setOpen(false);
      resetForm();
    });
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => handleOpenChange(true)} className="contents cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button onClick={() => handleOpenChange(true)} className="gap-2">
          <Plus className="size-4" />
          <span>Nouveau groupe</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Créer un groupe</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="group-name">Nom du groupe</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Membres</Label>
                <PlayerSelect
                  multiple
                  players={availablePlayers}
                  value={selectedPlayerIds}
                  onChange={(ids) => setSelectedPlayerIds(ids)}
                  placeholder="Sélectionner des membres..."
                  emptyText="Aucun joueur trouvé"
                  searchPlaceholder="Rechercher par pseudo ou nom RP..."
                  disabled={isPending}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
