"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check } from "@phosphor-icons/react";

import { promoteToWhitelisted } from "@/lib/actions/staff-review-actions";
import { CHARACTER_CLASSES, type CharacterClass } from "@/lib/character-classes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AtlasPromoteButtonProps {
  playerId: string;
  pseudo: string;
  characterSheetId?: string;
  preferredClasses?: CharacterClass[];
}

export function AtlasPromoteButton({
  playerId,
  pseudo,
  characterSheetId,
  preferredClasses = [],
}: AtlasPromoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(
    preferredClasses[0] ?? null
  );
  const [isPending, startTransition] = useTransition();

  const primaryChoice = preferredClasses[0] ?? null;
  const secondaryChoice = preferredClasses[1] ?? null;

  function handleOpenChange(newOpen: boolean) {
    if (!isPending) {
      setOpen(newOpen);
      if (newOpen) {
        setSelectedClass(preferredClasses[0] ?? null);
      }
    }
  }

  function handleConfirm() {
    if (!selectedClass) {
      toast.error("Veuillez sélectionner une classe RP pour le joueur.");
      return;
    }

    startTransition(async () => {
      try {
        await promoteToWhitelisted(playerId, selectedClass, characterSheetId);
        const classDef = CHARACTER_CLASSES.find((c) => c.id === selectedClass);
        toast.success(
          `${pseudo} a été whitelisté avec succès avec la classe ${classDef?.singularLabel ?? selectedClass} !`
        );
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => handleOpenChange(true)}>
        Valider la whitelist
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Valider la whitelist du joueur</DialogTitle>
            <DialogDescription>
              <span className="text-foreground font-medium">{pseudo}</span> sera inscrit à la
              whitelist et débloquera l&apos;accès au serveur Minecraft. Vous devez impérativement
              lui attribuer sa classe RP définitive.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {preferredClasses.length > 0 && (
              <div className="bg-muted/40 rounded-lg border p-3 text-xs">
                <span className="text-muted-foreground font-semibold">
                  Souhaits formulés par le joueur :
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {primaryChoice && (
                    <Badge variant="outline" className="gap-1">
                      <span className="text-muted-foreground">Principal :</span>
                      {CHARACTER_CLASSES.find((c) => c.id === primaryChoice)?.singularLabel ??
                        primaryChoice}
                    </Badge>
                  )}
                  {secondaryChoice && (
                    <Badge variant="outline" className="gap-1">
                      <span className="text-muted-foreground">Secondaire :</span>
                      {CHARACTER_CLASSES.find((c) => c.id === secondaryChoice)?.singularLabel ??
                        secondaryChoice}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
                Classe RP à attribuer <span className="text-destructive">*</span>
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CHARACTER_CLASSES.map((cls) => {
                  const isSelected = selectedClass === cls.id;
                  const isPrimary = primaryChoice === cls.id;
                  const isSecondary = secondaryChoice === cls.id;
                  const IconComponent = cls.icon;

                  return (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => setSelectedClass(cls.id)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-primary/25 ring-2 shadow-xs"
                          : "border-border/70 hover:border-primary/40 hover:bg-muted/40 bg-card",
                        isPending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <IconComponent size={20} />
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground text-sm font-medium">
                            {cls.singularLabel}
                          </span>
                          {isPrimary && (
                            <span className="text-primary text-[10px] font-semibold uppercase">
                              (Choix 1)
                            </span>
                          )}
                          {isSecondary && (
                            <span className="text-muted-foreground text-[10px] font-medium uppercase">
                              (Choix 2)
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground text-[11px] line-clamp-1">
                          {cls.description}
                        </span>
                      </div>

                      {isSelected && (
                        <Check className="text-primary size-4 shrink-0 font-bold" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
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
              onClick={handleConfirm}
              disabled={!selectedClass || isPending}
            >
              {isPending ? "Validation en cours..." : "Valider la whitelist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
