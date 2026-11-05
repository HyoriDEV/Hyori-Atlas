"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { createStaffTicket } from "@/lib/actions/ticket-actions";
import { PlayerSelect, type PlayerOption } from "@/components/player-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface NewStaffTicketDialogProps {
  availablePlayers: PlayerOption[];
}

/** Bouton « Ouvrir un ticket » côté staff : contacter un joueur sans passer par la vue joueur. */
export function NewStaffTicketDialog({ availablePlayers }: NewStaffTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.GENERAL_QUESTION);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setPlayerId(null);
    setCategory(TicketCategory.GENERAL_QUESTION);
    setSubject("");
    setMessage("");
  }

  const canSubmit = Boolean(playerId && subject.trim() && message.trim()) && !isPending;

  function handleSubmit() {
    if (!playerId || !subject.trim() || !message.trim()) return;
    startTransition(async () => {
      try {
        const ticket = await createStaffTicket({ playerId, category, subject, message });
        toast.success("Ticket ouvert.");
        resetForm();
        setOpen(false);
        router.push(`/staff/tickets/${ticket.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>Ouvrir un ticket</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
          <DialogDescription>
            Contacte un joueur. Il recevra le message signé « Staff » et une notification Discord.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Joueur</Label>
            <PlayerSelect
              players={availablePlayers}
              value={playerId}
              onChange={(id) => setPlayerId(id)}
              placeholder="Sélectionner un joueur..."
              searchPlaceholder="Rechercher par pseudo ou nom RP..."
              disabled={isPending}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ticketCategories.map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={category === cat ? "default" : "outline"}
                onClick={() => setCategory(cat)}
                disabled={isPending}
              >
                {ticketCategoryLabels[cat]}
              </Button>
            ))}
          </div>

          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Sujet du ticket"
            disabled={isPending}
          />
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Premier message au joueur"
            rows={4}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Annuler
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Ouverture..." : "Ouvrir le ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
