"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "@phosphor-icons/react";
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
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.OPEN);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setPlayerId(null);
    setCategory(TicketCategory.OPEN);
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
        toast.success(
          category === TicketCategory.SECRET
            ? "Ticket confidentiel ouvert avec succès (Admin & Suivi RP)."
            : "Ticket ouvert avec succès."
        );
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCategory(TicketCategory.OPEN)}
              disabled={isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                category === TicketCategory.OPEN
                  ? "border-primary bg-primary/5 text-foreground ring-primary ring-1"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                <LockOpen className="size-3.5 text-emerald-500" />
                <span>Ticket standard</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-tight">
                Accessible à toute l&apos;équipe staff.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCategory(TicketCategory.SECRET)}
              disabled={isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                category === TicketCategory.SECRET
                  ? "text-foreground border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                <Lock className="size-3.5 text-amber-500" />
                <span>Spoiler RP / Confidentiel</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-tight">
                Restreint aux référents (Admin + Suivi RP).
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
