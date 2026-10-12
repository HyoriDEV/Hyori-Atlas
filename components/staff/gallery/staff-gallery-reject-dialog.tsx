"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewGalleryItemAction } from "@/lib/actions/gallery-actions";
import { GalleryStatus } from "@/lib/generated/prisma/enums";
import { toast } from "sonner";

const PREDEFINED_REASONS = [
  "Interface de jeu visible (HUD, barre d'inventaire ou F3 actif). Pensez à appuyer sur F1 pour les prochaines fois !",
  "Capture hors-sujet ou ne provenant pas de l'univers Hyori RP.",
  "Qualité d'image ou résolution insuffisante.",
  "Contenu inapproprié ou non-respect du règlement.",
  "Autre motif personnalisé...",
];

interface StaffGalleryRejectDialogProps {
  itemId: string | null;
  itemTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StaffGalleryRejectDialog({
  itemId,
  itemTitle,
  open,
  onOpenChange,
  onSuccess,
}: StaffGalleryRejectDialogProps) {
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleReject = () => {
    if (!itemId) return;

    const finalReason =
      selectedReason === "Autre motif personnalisé..." ? customReason.trim() : selectedReason;

    if (!finalReason) {
      toast.error("Veuillez indiquer un motif de refus.");
      return;
    }

    startTransition(async () => {
      try {
        await reviewGalleryItemAction({
          itemId,
          status: GalleryStatus.REJECTED,
          rejectionReason: finalReason,
        });
        toast.success("Capture refusée et déplacée dans les archives.");
        onOpenChange(false);
        onSuccess?.();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du refus.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-rose-500">
            Refuser la capture
          </DialogTitle>
          <DialogDescription>
            {itemTitle ? `Capture : "${itemTitle}"` : "Cette capture sera rejetée de la galerie."} Le motif sera visible par le joueur dans son espace personnel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <span className="text-xs font-semibold text-foreground">Sélectionner un motif :</span>
          <div className="flex flex-col gap-2">
            {PREDEFINED_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              >
                <input
                  type="radio"
                  name="rejectionReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="mt-0.5 text-primary"
                />
                <span className="leading-snug">{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === "Autre motif personnalisé..." && (
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-xs font-semibold">Précisez le motif :</span>
              <Textarea
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Indiquez clairement ce qui doit être corrigé..."
                className="text-xs rounded-xl resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
            className="rounded-xl"
          >
            {isPending ? "Refus en cours..." : "Confirmer le refus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
