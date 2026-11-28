"use client";

import { useId, useState, useTransition } from "react";
import { Copy, LinkSimple } from "@phosphor-icons/react";
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
import { Switch } from "@/components/ui/switch";
import { setPersonalTramePublication } from "@/lib/actions/personal-trame-publication-actions";

export function PersonalTrameShareDialog({
  characterSheetId,
  token,
}: {
  characterSheetId: string;
  token: string | null;
}) {
  const consentId = useId();
  const linkId = useId();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [enabled, setEnabled] = useState(Boolean(token));
  const [saving, startSaving] = useTransition();
  const shareUrl = token ? `${origin}/trame/${token}` : null;

  function handleOpenChange(nextOpen: boolean) {
    if (saving) return;
    if (nextOpen) {
      setOrigin(window.location.origin);
      setEnabled(Boolean(token));
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || enabled === Boolean(token)) return;

    startSaving(async () => {
      try {
        const result = await setPersonalTramePublication(characterSheetId, enabled);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(result.token ? "Partage public activé." : "Partage public désactivé.");
      } catch {
        toast.error("Impossible d’enregistrer le réglage de partage.");
      }
    });
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié.");
    } catch {
      toast.error("Tu peux sélectionner et copier le lien manuellement.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <LinkSimple className="text-primary size-4" />
        {token ? "Partage public activé" : "Partager la trame"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Partager la trame par lien</DialogTitle>
            <DialogDescription>
              Toute personne qui possède le lien pourra lire les chapitres de ce personnage, même
              sans compte. Si tu désactives puis réactives le partage, le même lien fonctionnera de
              nouveau.
            </DialogDescription>
          </DialogHeader>

          <div className="border-border flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label id={consentId}>Autoriser la lecture publique via le lien</Label>
            <Switch
              aria-labelledby={consentId}
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={saving}
            />
          </div>

          {shareUrl && enabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={linkId}>Lien permanent</Label>
              <div className="flex items-center gap-2">
                <Input id={linkId} value={shareUrl} readOnly />
                <Button type="button" variant="outline" onClick={copyLink}>
                  <Copy className="size-4" />
                  Copier
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Fermer
            </Button>
            <Button type="submit" disabled={saving || enabled === Boolean(token)}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
