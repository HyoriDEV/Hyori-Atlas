"use client";

import { useState, useTransition } from "react";

import { TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { createTicket } from "@/lib/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const ticketCategories = Object.values(TicketCategory);

export function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setCategory(null);
    setSubject("");
    setDescription("");
  }

  function handleSubmit() {
    if (!category || !subject.trim() || !description.trim()) return;
    startTransition(async () => {
      await createTicket(category, subject, description);
      resetForm();
      setOpen(false);
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
      <DialogTrigger render={<Button />}>Ouvrir un ticket</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
          <DialogDescription>
            Décrivez votre demande, le staff vous répondra dès que possible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {ticketCategories.map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={category === cat ? "default" : "outline"}
                onClick={() => setCategory(cat)}
              >
                {ticketCategoryLabels[cat]}
              </Button>
            ))}
          </div>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Résume ta demande en une phrase"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Détaille ta demande"
            rows={4}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !category || !subject.trim() || !description.trim()}
          >
            Créer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
