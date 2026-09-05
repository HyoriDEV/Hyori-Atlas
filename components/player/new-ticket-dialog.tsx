"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export function NewTicketDialog({
  ticketCreationEnabled = true,
}: {
  ticketCreationEnabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!ticketCreationEnabled) {
    return (
      <Button
        variant="secondary"
        onClick={() =>
          toast.error(
            "L'ouverture de tickets a été temporairement désactivée par un administrateur."
          )
        }
      >
        Ouvrir un ticket
      </Button>
    );
  }

  function resetForm() {
    setCategory(null);
    setSubject("");
    setDescription("");
  }

  function handleSubmit() {
    if (!category || !subject.trim() || !description.trim()) return;
    startTransition(async () => {
      try {
        const ticket = await createTicket(category, subject, description);
        toast.success("Ticket ouvert avec succès.");
        resetForm();
        setOpen(false);
        router.push(`/player/tickets/${ticket.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
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
      <DialogTrigger render={<Button />}>Ouvrir un ticket</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
          <DialogDescription>
            Décris ta demande, le staff te répondra dès que possible.
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
