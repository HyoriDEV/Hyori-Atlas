"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DotsThreeVertical,
  CheckCircle,
  WarningCircle,
  Clock,
  User,
  Trash,
  XCircle,
  Copy,
  Scroll,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  cancelInterviewBooking,
  deleteInterviewSlot,
  updateInterviewBookingStatus,
} from "@/lib/actions/interview-slot-actions";
import { InterviewBookingStatus } from "@/lib/generated/prisma/enums";
import { interviewBookingStatusLabels } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InterviewSlotItem } from "./types";

interface InterviewSlotRowActionsProps {
  slot: InterviewSlotItem;
}

export function InterviewSlotRowActions({ slot }: InterviewSlotRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState(false);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState(false);
  const [deleteSlotWithBooking, setDeleteSlotWithBooking] = useState(false);

  const booking = slot.booking;
  const player = booking?.player;

  function handleStatusChange(newStatus: InterviewBookingStatus) {
    if (!booking) return;
    startTransition(async () => {
      try {
        await updateInterviewBookingStatus(booking.id, newStatus);
        toast.success(`Statut mis à jour : ${interviewBookingStatusLabels[newStatus]}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
      }
    });
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier !`);
  }

  function handleCancelBooking() {
    if (!booking) return;
    startTransition(async () => {
      try {
        await cancelInterviewBooking(booking.id, deleteSlotWithBooking);
        toast.success(
          deleteSlotWithBooking
            ? "Réservation et créneau supprimés."
            : "Réservation annulée, le créneau est de nouveau libre."
        );
        setConfirmCancelBooking(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'annulation.");
      }
    });
  }

  function handleDeleteSlot() {
    startTransition(async () => {
      try {
        await deleteInterviewSlot(slot.id);
        toast.success("Créneau supprimé.");
        setConfirmDeleteSlot(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground"
            />
          }
        >
          <DotsThreeVertical className="size-4" weight="bold" />
          <span className="sr-only">Actions</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {booking && player ? (
            <>
              <DropdownMenuLabel>Statut de l&apos;entretien</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleStatusChange(InterviewBookingStatus.ACCEPTED)}
                disabled={isPending || booking.status === InterviewBookingStatus.ACCEPTED}
                className="gap-2 text-emerald-500 focus:text-emerald-500"
              >
                <CheckCircle className="size-4" />
                Marquer comme Accepté
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(InterviewBookingStatus.CHANGES_REQUESTED)}
                disabled={isPending || booking.status === InterviewBookingStatus.CHANGES_REQUESTED}
                className="gap-2 text-amber-500 focus:text-amber-500"
              >
                <WarningCircle className="size-4" />
                Demander modifications
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(InterviewBookingStatus.REGISTERED)}
                disabled={isPending || booking.status === InterviewBookingStatus.REGISTERED}
                className="gap-2 text-blue-500 focus:text-blue-500"
              >
                <Clock className="size-4" />
                Remettre en Attente (Inscrit)
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Joueur</DropdownMenuLabel>
              <DropdownMenuItem
                render={<Link href={`/staff/atlas/${player.id}`} />}
                className="gap-2"
              >
                <User className="size-4" />
                Voir le dossier Atlas
              </DropdownMenuItem>

              {player.characterSheet && (
                <DropdownMenuItem
                  render={<Link href={`/staff/atlas/${player.id}`} />}
                  className="gap-2"
                >
                  <Scroll className="size-4" />
                  Fiche personnage
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => handleCopy(player.discordUsername, "Tag Discord")}
                className="gap-2"
              >
                <Copy className="size-4" />
                Copier Discord (@{player.discordUsername})
              </DropdownMenuItem>

              {player.minecraftUsername && (
                <DropdownMenuItem
                  onClick={() => handleCopy(player.minecraftUsername!, "Pseudo Minecraft")}
                  className="gap-2"
                >
                  <Copy className="size-4" />
                  Copier Minecraft ({player.minecraftUsername})
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setConfirmCancelBooking(true)}
                className="text-destructive focus:text-destructive gap-2"
              >
                <XCircle className="size-4" />
                Annuler la réservation
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => setConfirmDeleteSlot(true)}
                className="text-destructive focus:text-destructive gap-2"
              >
                <Trash className="size-4" />
                Supprimer le créneau
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation suppression de créneau libre */}
      <AlertDialog open={confirmDeleteSlot} onOpenChange={setConfirmDeleteSlot}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce créneau libre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce créneau d&apos;entretien ne sera plus visible ni réservable par les joueurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteSlot}
              disabled={isPending}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation annulation d'une réservation */}
      <AlertDialog open={confirmCancelBooking} onOpenChange={setConfirmCancelBooking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réservation du joueur ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Le joueur {player?.minecraftUsername ?? player?.discordDisplayName} verra sa
                réservation annulée.
              </span>
              <label className="bg-muted/40 text-foreground mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-xs">
                <input
                  type="checkbox"
                  checked={deleteSlotWithBooking}
                  onChange={(e) => setDeleteSlotWithBooking(e.target.checked)}
                  className="accent-primary size-4 rounded"
                />
                <span>Supprimer également le créneau horaire du planning</span>
              </label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Fermer</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isPending}
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
