"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle,
  CircleNotch,
  PaperPlaneTilt,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  getEligibleInterviewReminderCandidatesAction,
  sendInterviewRemindersAction,
  type EligibleInterviewReminderCandidate,
} from "@/lib/actions/interview-slot-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InterviewReminderDialog() {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<EligibleInterviewReminderCandidate[] | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setIsLoadingCandidates(true);
      try {
        const list = await getEligibleInterviewReminderCandidatesAction();
        setCandidates(list);
      } catch {
        toast.error("Impossible de récupérer la liste des candidats à relancer.");
        setCandidates([]);
      } finally {
        setIsLoadingCandidates(false);
      }
    }
  }

  function handleSendReminders() {
    startTransition(async () => {
      try {
        const result = await sendInterviewRemindersAction();
        if (!result.success) {
          toast.error(result.error || "Erreur lors de l'envoi des notifications.");
          return;
        }

        if (result.total === 0) {
          toast.info(result.message || "Aucun joueur éligible à relancer.");
        } else {
          if (result.sent > 0) {
            toast.success(
              `${result.sent} notification${result.sent > 1 ? "s" : ""} Discord envoyée${result.sent > 1 ? "s" : ""} avec succès !`
            );
          }
          if (result.dmClosed > 0) {
            toast.warning(
              `${result.dmClosed} joueur${result.dmClosed > 1 ? "s ont" : " a"} ses MP fermés ou a bloqué le bot.`
            );
          }
          if (result.failed > 0) {
            toast.error(
              `${result.failed} échec${result.failed > 1 ? "s" : ""} de distribution Discord.`
            );
          }
        }

        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur inattendue lors de l'envoi des relances."
        );
      }
    });
  }

  const count = candidates?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <PaperPlaneTilt className="size-4" />
            Relancer
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <PaperPlaneTilt className="size-4" />
            </div>
            <div>
              <DialogTitle>Relancer les candidats à l&apos;entretien</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Envoie un message privé Discord aux joueurs dont la fiche est validée pour les
                inviter à réserver un créneau.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoadingCandidates ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CircleNotch className="text-primary size-7 animate-spin" />
            <p className="text-muted-foreground mt-2 text-xs">Recherche des joueurs éligibles...</p>
          </div>
        ) : count === 0 ? (
          <div className="bg-muted/40 border-border/60 flex flex-col items-center justify-center rounded-lg border p-6 text-center">
            <CheckCircle className="text-muted-foreground size-8" />
            <h4 className="text-foreground mt-2 text-sm font-medium">Aucun candidat à relancer</h4>
            <p className="text-muted-foreground mt-1 text-xs">
              Tous les joueurs avec le statut « En whitelist » et une fiche validée ont déjà réservé
              un créneau ou ont leur entretien planifié.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                Candidats sans créneau réservé
              </span>
              <Badge variant="secondary" className="gap-1 text-xs">
                <UsersThree className="size-3.5" />
                {count} joueur{count > 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Liste défilante des candidats ciblés */}
            <div className="border-border/60 divide-border/40 max-h-56 divide-y overflow-y-auto rounded-lg border">
              {candidates?.map((candidate) => (
                <div
                  key={candidate.id}
                  className="hover:bg-muted/30 flex items-center justify-between p-2.5 text-xs transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarImage
                        src={candidate.discordAvatarUrl ?? undefined}
                        alt={candidate.discordDisplayName || candidate.discordUsername}
                      />
                      <AvatarFallback>
                        {(candidate.discordDisplayName ||
                          candidate.discordUsername)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-medium">
                        {candidate.discordDisplayName || candidate.discordUsername}
                      </p>
                      {candidate.characterSheetName && (
                        <p className="text-muted-foreground truncate text-[11px]">
                          RP : {candidate.characterSheetName}
                        </p>
                      )}
                    </div>
                  </div>

                  {candidate.previousBookingStatus === "CHANGES_REQUESTED" ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-500/40 text-[10px] text-amber-500"
                    >
                      Nouvel entretien requis
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground shrink-0 text-[10px]">
                      Sans créneau
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-[11px]">
              <WarningCircle className="text-foreground/70 mt-0.5 size-4 shrink-0" />
              <span>
                Chaque joueur recevra un message direct de <strong>HyoriBot</strong> contenant le
                lien direct vers son portail de réservation.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            {count === 0 ? "Fermer" : "Annuler"}
          </Button>

          {count > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSendReminders}
              disabled={isPending || isLoadingCandidates}
              className="gap-1.5"
            >
              {isPending ? (
                <>
                  <CircleNotch className="size-3.5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="size-3.5" />
                  Envoyer les relances ({count})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
