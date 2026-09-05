"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  CHARACTER_CLASSES,
  REQUIRED_CLASS_CHOICES_COUNT,
  MAX_CLASS_CHOICES_COUNT,
  type CharacterClass,
} from "@/lib/character-classes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CharacterClassCirclesProps {
  selectedClasses: CharacterClass[];
  interactive?: boolean;
  onChange?: (classes: CharacterClass[]) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showOrderBadge?: boolean;
}

export function CharacterClassCircles({
  selectedClasses = [],
  interactive = false,
  onChange,
  className,
  size = "md",
  showOrderBadge = true,
}: CharacterClassCirclesProps) {
  function handleToggle(classId: CharacterClass) {
    if (!interactive || !onChange) return;

    const isSelected = selectedClasses.includes(classId);

    if (isSelected) {
      onChange(selectedClasses.filter((id) => id !== classId));
    } else {
      if (selectedClasses.length < MAX_CLASS_CHOICES_COUNT) {
        onChange([...selectedClasses, classId]);
      } else {
        // If already 2 selected, replace the 2nd one
        onChange([selectedClasses[0], classId]);
      }
    }
  }

  const sizeClasses = {
    sm: "size-9 text-base",
    md: "size-11 text-lg",
    lg: "size-13 text-xl",
  }[size];

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  }[size];

  const badgeSizeClasses = {
    sm: "size-3.5 text-[9px] -top-0.5 -right-0.5",
    md: "size-4 text-[10px] -top-1 -right-1",
    lg: "size-4.5 text-[11px] -top-1 -right-1",
  }[size];

  return (
    <TooltipProvider delay={100}>
      <div className={cn("flex flex-wrap items-center gap-3", className)}>
        {CHARACTER_CLASSES.map((cls) => {
          const index = selectedClasses.indexOf(cls.id);
          const isSelected = index !== -1;
          const choiceNumber = index + 1;
          const IconComponent = cls.icon;

          const circleElement = (
            <div
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? isSelected : undefined}
              aria-label={`${cls.label}${isSelected ? ` (${choiceNumber}e choix)` : ""}`}
              onClick={interactive ? () => handleToggle(cls.id) : undefined}
              onKeyDown={
                interactive
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleToggle(cls.id);
                      }
                    }
                  : undefined
              }
              className={cn(
                "relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
                sizeClasses,
                interactive
                  ? "focus-visible:ring-primary cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                  : "cursor-default",
                isSelected
                  ? "border-primary bg-primary/15 text-primary ring-primary/20 border-2 shadow-xs ring-2"
                  : interactive
                    ? "border-border/80 bg-muted/30 text-muted-foreground/60 hover:border-primary/50 hover:bg-muted/70 hover:text-foreground border"
                    : "border-border/60 bg-muted/20 text-muted-foreground/35 border opacity-40 hover:opacity-85"
              )}
            >
              <IconComponent size={iconSizes} className="shrink-0" />

              {isSelected && showOrderBadge && (
                <span
                  className={cn(
                    "bg-primary text-primary-foreground absolute flex items-center justify-center rounded-full font-bold shadow-xs",
                    badgeSizeClasses
                  )}
                >
                  {choiceNumber}
                </span>
              )}
            </div>
          );

          return (
            <Tooltip key={cls.id}>
              <TooltipTrigger render={circleElement} />
              <TooltipContent side="top" className="flex max-w-xs flex-col gap-0.5 p-2 text-left">
                <div className="text-background flex items-center gap-1.5 text-xs font-semibold">
                  <span>{cls.label}</span>
                  {isSelected && (
                    <span className="text-[10px] font-medium opacity-85">
                      ({choiceNumber === 1 ? "1er choix" : "2e choix"})
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug opacity-80">{cls.description}</p>
                {interactive &&
                  !isSelected &&
                  selectedClasses.length < REQUIRED_CLASS_CHOICES_COUNT && (
                    <span className="text-primary-foreground/70 mt-0.5 text-[10px] italic">
                      Cliquer pour choisir
                    </span>
                  )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
