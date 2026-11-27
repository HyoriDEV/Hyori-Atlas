"use client";

import { useState, useTransition } from "react";
import { Users } from "@phosphor-icons/react";
import { toast } from "sonner";

import { PlayerSelect, type PlayerOption } from "@/components/player-select";
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
import {
  getPersonalTrameShareOptions,
  savePersonalTrameShares,
} from "@/lib/actions/personal-trame-share-actions";

export function PersonalTrameShareDialog({ characterSheetId }: { characterSheetId: string }) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerOption[] | null>(null);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function loadPlayers() {
    setPlayers(null);
    setLoadError(undefined);
    startLoading(async () => {
      try {
        const result = await getPersonalTrameShareOptions(characterSheetId);
        if (result.error) {
          setLoadError(result.error);
          return;
        }
        setPlayers(result.players ?? []);
        setRecipientIds(result.recipientIds ?? []);
      } catch {
        setLoadError("Impossible de charger la liste de joueurs.");
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (saving || loading) return;
    setOpen(nextOpen);
    if (nextOpen) loadPlayers();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!players || saving) return;

    startSaving(async () => {
      try {
        const result = await savePersonalTrameShares(characterSheetId, recipientIds);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Les accès à ta trame ont été mis à jour.");
        setOpen(false);
      } catch {
        toast.error("Impossible d’enregistrer les accès à ta trame.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Users className="text-primary size-4" />
        Partager la trame
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Partager la trame</DialogTitle>
            <DialogDescription>
              Les joueurs sélectionnés pourront lire les chapitres de ce personnage. Pour retirer un
              accès, désélectionne le joueur puis enregistre.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p role="status" className="text-muted-foreground text-sm">
              Chargement des joueurs…
            </p>
          ) : loadError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p role="alert" className="text-destructive text-sm">
                {loadError}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={loadPlayers}>
                Réessayer
              </Button>
            </div>
          ) : players ? (
            <PlayerSelect
              multiple
              players={players}
              value={recipientIds}
              onChange={setRecipientIds}
              searchPlaceholder="Rechercher par pseudo…"
              placeholder="Sélectionner les joueurs"
              disabled={saving}
            />
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving || loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!players || loading || saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
