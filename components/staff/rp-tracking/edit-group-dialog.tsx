"use client";

import { useState, useTransition } from "react";
import { PencilSimple, CircleNotch } from "@phosphor-icons/react";
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
import { updateRpTrackingGroupAction } from "@/lib/actions/group-rp-tracking-actions";

export function EditGroupDialog({
  group,
  trigger,
}: {
  group: { id: string; name: string; description?: string | null };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateRpTrackingGroupAction({
        groupId: group.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Une erreur est survenue.");
        toast.error(res.error || "Échec de la modification du groupe.");
        return;
      }

      toast.success("Groupe mis à jour avec succès.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <PencilSimple className="size-4" />
          <span>Modifier</span>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le groupe de suivi</DialogTitle>
            <DialogDescription>
              Modifiez le nom et la description de ce groupe de suivi RP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-group-name">Nom du groupe *</Label>
              <Input
                id="edit-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-group-description">Description ou contexte</Label>
              <Textarea
                id="edit-group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
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
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
