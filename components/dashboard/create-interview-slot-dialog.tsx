"use client";

import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";

import { createInterviewSlot } from "@/lib/actions/interview-slot-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateInterviewSlotDialog() {
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setStartsAt("");
    setError(null);
  }

  function handleSubmit() {
    if (!startsAt) return;
    setError(null);
    startTransition(async () => {
      try {
        await createInterviewSlot(new Date(startsAt));
        resetForm();
        setOpen(false);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus />
        Nouveau créneau
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau créneau d&apos;entretien</DialogTitle>
          <DialogDescription>
            Choisis une date et une heure disponibles pour un entretien whitelist.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="starts-at">Date et heure</Label>
          <Input
            id="starts-at"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isPending || !startsAt}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
