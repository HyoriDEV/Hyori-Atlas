"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scroll, Wrench } from "@phosphor-icons/react";
import { toast } from "sonner";

import { TicketCategory } from "@/lib/generated/prisma/enums";
import { createStaffTicket } from "@/lib/actions/ticket-actions";
import { TICKET_SUBJECT_MAX_LENGTH } from "@/lib/ticket-constants";
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
import { cn } from "@/lib/utils";

interface NewStaffTicketDialogProps {
  availablePlayers: PlayerOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

/** Bouton « Ouvrir un ticket » côté staff : contacter un joueur sans passer par la vue joueur. */
export function NewStaffTicketDialog({
  availablePlayers,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideTrigger = false,
}: NewStaffTicketDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.RP);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setPlayerId(null);
    setCategory(TicketCategory.RP);
    setSubject("");
    setMessage("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    if (isControlled) {
      setControlledOpen?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) resetForm();
  }

  const canSubmit =
    Boolean(
      playerId &&
      subject.trim() &&
      subject.trim().length <= TICKET_SUBJECT_MAX_LENGTH &&
      message.trim()
    ) && !isPending;

  function handleSubmit() {
    if (
      !playerId ||
      !subject.trim() ||
      subject.trim().length > TICKET_SUBJECT_MAX_LENGTH ||
      !message.trim()
    )
      return;
    startTransition(async () => {
      try {
        const ticket = await createStaffTicket({ playerId, category, subject, message });
        toast.success("Ticket ouvert avec succès.");
        resetForm();
        handleOpenChange(false);
        router.push(`/staff/tickets/${ticket.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && <DialogTrigger render={<Button />}>Ouvrir un ticket</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:p-6">
        <DialogHeader className="gap-1.5 pb-1">
          <DialogTitle className="text-xl">Nouveau ticket</DialogTitle>
          <DialogDescription className="text-sm">
            Contacte un joueur. Il recevra le message signé « Staff » et une notification Discord.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCategory(TicketCategory.RP)}
              disabled={isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                category === TicketCategory.RP
                  ? "border-primary bg-primary/5 text-foreground ring-primary ring-1"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                <Scroll className="size-4 text-blue-500" />
                <span>Ticket RP</span>
              </div>
              <p className="text-muted-foreground text-xs leading-normal">
                Projets, intrigues, suivi RP et lore.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCategory(TicketCategory.TECHNIQUE)}
              disabled={isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                category === TicketCategory.TECHNIQUE
                  ? "border-primary bg-primary/5 text-foreground ring-primary ring-1"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                <Wrench className="size-4 text-purple-500" />
                <span>Ticket technique</span>
              </div>
              <p className="text-muted-foreground text-xs leading-normal">
                Bugs, signalements et support technique.
              </p>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="staff-ticket-subject">Intitulé</Label>
              <span className="text-muted-foreground text-[10px]">
                {subject.length}/{TICKET_SUBJECT_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="staff-ticket-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Intitulé du ticket"
              maxLength={TICKET_SUBJECT_MAX_LENGTH}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-ticket-message">Premier message</Label>
            <Textarea
              id="staff-ticket-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Premier message au joueur..."
              rows={5}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
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
