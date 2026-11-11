"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlayerSelect, type PlayerOption } from "@/components/player-select";
import { createRpTrackingGroupAction } from "@/lib/actions/group-rp-tracking-actions";

export function CreateGroupDialog({
  availablePlayers,
  trigger,
}: {
  availablePlayers: PlayerOption[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedPlayerIds([]);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createRpTrackingGroupAction({
        name: name.trim(),
        description: description.trim() || undefined,
        memberUserIds: selectedPlayerIds,
      });

      if (!res.success || !res.groupId) {
        setError(res.error || "Une erreur est survenue.");
        toast.error(res.error || "Échec de la création du groupe.");
        return;
      }

      toast.success(`Le groupe « ${name.trim()} » a été créé avec succès.`);
      setOpen(false);
      resetForm();
      router.push(`/staff/rp-tracking/groups/${res.groupId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger render={<Button size="sm" className="gap-2" />}>
          <Plus className="size-4" />
          <span>Nouveau groupe de suivi</span>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="text-primary size-5" />
              <span>Créer un groupe de suivi RP</span>
            </DialogTitle>
            <DialogDescription>
              Créez un espace de suivi RP partagé (narration et conversation) pour plusieurs joueurs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="group-name">Nom du groupe RP *</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Expédition du Nord, Cercle des Mages..."
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-description">Description ou contexte (facultatif)</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexte narratif, lieu ou objectif du groupe..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Membres initiaux du groupe</Label>
              <PlayerSelect
                players={availablePlayers}
                multiple={true}
                value={selectedPlayerIds}
                onChange={(ids) => setSelectedPlayerIds(ids)}
                placeholder="Sélectionner les joueurs du groupe..."
                triggerClassName="w-full"
              />
              <p className="text-muted-foreground text-xs">
                Vous pourrez ajouter ou retirer des membres à tout moment par la suite.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? (
                <>
                  <CircleNotch className="size-4 animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <span>Créer le groupe</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
