"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowsLeftRight,
  CheckCircle,
  CircleNotch,
  WarningCircle,
  Info,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  lookupDiscordAccount,
  transferDiscordAccount,
  type DiscordLookupResult,
} from "@/lib/actions/discord-transfer-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AtlasTransferDiscordButtonProps {
  playerId: string;
  currentDiscordId: string;
  currentDisplayName: string;
  currentUsername: string;
  currentAvatarUrl?: string | null;
}

export function AtlasTransferDiscordButton({
  playerId,
  currentDiscordId,
  currentDisplayName,
  currentUsername,
  currentAvatarUrl,
}: AtlasTransferDiscordButtonProps) {
  const [open, setOpen] = useState(false);
  const [newDiscordId, setNewDiscordId] = useState("");
  const [lookupResult, setLookupResult] = useState<DiscordLookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setNewDiscordId("");
      setLookupResult(null);
      setIsSearching(false);
    }
  }

  function handleIdChange(rawVal: string) {
    const digits = rawVal.replace(/\D/g, "");
    setNewDiscordId(digits);
    if (!/^\d{17,20}$/.test(digits) || digits === currentDiscordId) {
      setLookupResult(null);
      setIsSearching(false);
    }
  }

  // Recherche automatique lorsque l'ID fait entre 17 et 20 chiffres
  useEffect(() => {
    const trimmed = newDiscordId.trim();
    if (!/^\d{17,20}$/.test(trimmed) || trimmed === currentDiscordId) {
      return;
    }

    let active = true;
    const searchTimeout = setTimeout(() => {
      setIsSearching(true);
    }, 0);

    const timer = setTimeout(async () => {
      try {
        const result = await lookupDiscordAccount(trimmed);
        if (active) {
          setLookupResult(result);
        }
      } catch (err) {
        if (active) {
          console.error("Erreur de lookup Discord :", err);
          setLookupResult(null);
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(searchTimeout);
      clearTimeout(timer);
    };
  }, [newDiscordId, currentDiscordId]);

  const isSameAsCurrent = newDiscordId.trim() === currentDiscordId;
  const isTargetBlocked = lookupResult?.existingUser?.hasData === true;
  const canSubmit =
    /^\d{17,20}$/.test(newDiscordId.trim()) &&
    !isSameAsCurrent &&
    !isTargetBlocked &&
    !isPending &&
    !isSearching;

  function handleConfirmTransfer() {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        const res = await transferDiscordAccount({
          playerId,
          newDiscordId: newDiscordId.trim(),
        });
        toast.success(`Compte Discord transféré avec succès vers ${res.newDisplayName} !`);
        handleOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors du transfert du compte."
        );
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        title="Transférer vers un autre compte Discord"
      >
        <ArrowsLeftRight className="size-3.5" weight="bold" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transférer le compte Discord</DialogTitle>
            <DialogDescription>
              Associe un nouveau compte Discord à ce joueur. Toutes ses données (fiches de
              personnage, whitelist, historique, compte Minecraft) seront intégralement
              conservées.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Compte actuel */}
            <div className="rounded-lg border bg-muted/40 p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentDisplayName} />
                  <AvatarFallback>{currentDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {currentDisplayName} ({currentUsername})
                  </span>
                  <span className="text-muted-foreground">ID actuel : {currentDiscordId}</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Actuel
              </span>
            </div>

            {/* Saisie du nouveau compte */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-discord-id">
                Nouvel identifiant Discord (ID / Snowflake)
              </Label>
              <div className="relative">
                <Input
                  id="new-discord-id"
                  placeholder="Ex : 282119932085796864"
                  value={newDiscordId}
                  onChange={(e) => handleIdChange(e.target.value)}
                  disabled={isPending}
                  maxLength={20}
                  className="pr-8 font-mono text-xs"
                />
                {isSearching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <CircleNotch className="size-4 animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                L&apos;identifiant Discord est une suite de 17 à 20 chiffres (obtenu via le mode développeur de Discord).
              </span>
            </div>

            {/* Erreur si même compte */}
            {isSameAsCurrent && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                <WarningCircle className="size-4 shrink-0" weight="fill" />
                <span>Cet identifiant est déjà celui associé à ce joueur.</span>
              </div>
            )}

            {/* Aperçu du compte cible */}
            {lookupResult && lookupResult.validFormat && (
              <div className="flex flex-col gap-2 rounded-lg border p-3 text-xs">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  Nouveau compte détecté
                </span>

                <div className="flex items-center gap-2.5">
                  <Avatar size="default">
                    <AvatarImage
                      src={lookupResult.profile?.avatarUrl ?? undefined}
                      alt={lookupResult.profile?.displayName ?? "Discord User"}
                    />
                    <AvatarFallback>
                      {(lookupResult.profile?.displayName ?? "D").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {lookupResult.profile?.displayName ?? "Compte Discord"}
                      {lookupResult.profile?.username && (
                        <span className="text-muted-foreground font-normal ml-1">
                          (@{lookupResult.profile.username})
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      ID : {newDiscordId.trim()}
                    </span>
                  </div>
                </div>

                {/* Cas 1: Collision bloquante avec un autre joueur actif */}
                {isTargetBlocked && (
                  <div className="mt-1 flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <WarningCircle className="size-4 shrink-0 mt-0.5" weight="fill" />
                    <span>
                      Ce compte Discord est déjà associé à un joueur actif avec des données (
                      <strong>{lookupResult.existingUser?.name}</strong>). Transfert impossible pour
                      éviter d&apos;écraser ce compte.
                    </span>
                  </div>
                )}

                {/* Cas 2: Compte orphelin temporaire sans données */}
                {lookupResult.existingUser && !lookupResult.existingUser.hasData && (
                  <div className="mt-1 flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
                    <Info className="size-4 shrink-0 mt-0.5" weight="fill" />
                    <span>
                      Un compte vide sans données existe déjà pour cet ID. Il sera automatiquement
                      remplacé par les données de ce joueur.
                    </span>
                  </div>
                )}

                {/* Cas 3: Nouveau compte propre */}
                {!lookupResult.existingUser && (
                  <div className="mt-1 flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-4 shrink-0" weight="fill" />
                    <span>Compte prêt à être lié. Aucune collision détectée.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmTransfer}
              disabled={!canSubmit}
            >
              {isPending ? (
                <>
                  <CircleNotch className="size-4 animate-spin mr-1.5" />
                  Transfert en cours...
                </>
              ) : (
                "Confirmer le transfert"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
