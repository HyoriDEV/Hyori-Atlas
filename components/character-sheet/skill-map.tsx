"use client";

import { cn } from "@/lib/utils";
import {
  MAX_SKILL_POINTS,
  MAX_TOTAL_SKILL_POINTS,
  SKILL_DEFINITIONS,
  isTotalSkillPointsValid,
  sumSkillPoints,
  type SkillField,
  type SkillValues,
} from "@/lib/character-sheet";

const points = Array.from({ length: MAX_SKILL_POINTS }, (_, index) => index + 1);

export function SkillMap({
  values,
  interactive = false,
  onChange,
}: {
  values: SkillValues;
  interactive?: boolean;
  onChange?: (field: SkillField, value: number) => void;
}) {
  const total = sumSkillPoints(values);
  const isValid = isTotalSkillPointsValid(total);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-heading text-base font-semibold">Carte de compétences</span>
        <span
          className={cn(
            "text-sm font-medium",
            isValid ? "text-muted-foreground" : "text-destructive"
          )}
        >
          {total} / {MAX_TOTAL_SKILL_POINTS} points
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {SKILL_DEFINITIONS.map((skill) => (
          <div
            key={skill.field}
            className="bg-card/50 text-card-foreground flex flex-col gap-2 rounded-lg border p-3 transition-colors"
          >
            <span className="text-muted-foreground text-center text-xs font-semibold tracking-wider uppercase">
              {skill.label}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground/80 flex-1 truncate text-right text-[11px] font-medium">
                {skill.lowLabel}
              </span>
              <div className="flex shrink-0 items-center justify-center gap-1">
                {points.map((point) => {
                  const filled = point <= values[skill.field];
                  return (
                    <button
                      key={point}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onChange?.(skill.field, point)}
                      aria-label={`${skill.label}: ${point}`}
                      className={cn(
                        "size-4 rounded-sm border transition-colors",
                        filled
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary/50",
                        interactive ? "cursor-pointer" : "cursor-default"
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-muted-foreground/80 flex-1 truncate text-left text-[11px] font-medium">
                {skill.highLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
