"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CHARACTER_CLASSES, type CharacterClass } from "@/lib/character-classes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export interface CharacterClassDualSelectorProps {
  selectedClasses?: CharacterClass[];
  interactive?: boolean;
  onChange?: (classes: CharacterClass[]) => void;
  className?: string;
}

export function CharacterClassDualSelector({
  selectedClasses = [],
  interactive = false,
  onChange,
  className,
}: CharacterClassDualSelectorProps) {
  const primaryClass = selectedClasses[0] ?? null;
  const secondaryClass = selectedClasses[1] ?? null;

  const primaryDef = CHARACTER_CLASSES.find((c) => c.id === primaryClass);
  const secondaryDef = CHARACTER_CLASSES.find((c) => c.id === secondaryClass);

  function handleSelectPrimary(clsId: CharacterClass) {
    if (!interactive || !onChange) return;

    if (primaryClass === clsId) {
      // Deselect primary
      onChange(secondaryClass ? [secondaryClass] : []);
      return;
    }

    if (secondaryClass === clsId) {
      // Swapping: was secondary, becomes primary
      onChange([clsId]);
      return;
    }

    onChange(secondaryClass ? [clsId, secondaryClass] : [clsId]);
  }

  function handleSelectSecondary(clsId: CharacterClass) {
    if (!interactive || !onChange) return;

    if (clsId === primaryClass) {
      return; // Cannot pick same class as secondary
    }

    if (secondaryClass === clsId) {
      // Deselect secondary
      onChange(primaryClass ? [primaryClass] : []);
      return;
    }

    if (primaryClass) {
      onChange([primaryClass, clsId]);
    } else {
      // If no primary yet, set as primary
      onChange([clsId]);
    }
  }

  function renderChoiceRow({
    title,
    selectedDef,
    currentChoiceId,
    disabledId,
    onSelect,
  }: {
    title: string;
    selectedDef?: (typeof CHARACTER_CLASSES)[number];
    currentChoiceId: CharacterClass | null;
    disabledId?: CharacterClass | null;
    onSelect: (id: CharacterClass) => void;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {CHARACTER_CLASSES.map((cls) => {
            const isSelected = currentChoiceId === cls.id;
            const isDisabled = disabledId === cls.id;
            const IconComponent = cls.icon;

            const button = (
              <button
                type="button"
                disabled={!interactive || isDisabled}
                onClick={interactive && !isDisabled ? () => onSelect(cls.id) : undefined}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-lg border transition-all duration-150",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary ring-primary/25 shadow-xs ring-2"
                    : isDisabled
                      ? "border-border/40 bg-muted/10 text-muted-foreground/30 cursor-not-allowed opacity-40"
                      : interactive
                        ? "border-border/80 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/70 hover:text-foreground cursor-pointer"
                        : "border-border/60 bg-muted/20 text-muted-foreground/50 cursor-default"
                )}
              >
                <IconComponent size={20} className="shrink-0" />
              </button>
            );

            return (
              <Tooltip key={cls.id}>
                <TooltipTrigger render={button} />
                <TooltipContent side="top">
                  {isDisabled ? `${cls.singularLabel} (choix principal)` : cls.singularLabel}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {renderChoiceRow({
        title: "Classe principale",
        selectedDef: primaryDef,
        currentChoiceId: primaryClass,
        onSelect: handleSelectPrimary,
      })}

      {renderChoiceRow({
        title: "Classe secondaire",
        selectedDef: secondaryDef,
        currentChoiceId: secondaryClass,
        disabledId: primaryClass,
        onSelect: handleSelectSecondary,
      })}
    </div>
  );
}
