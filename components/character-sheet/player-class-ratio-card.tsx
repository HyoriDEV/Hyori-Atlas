"use client";

import { Scales } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlayerClassWithStats } from "@/lib/role-balance";
import { getClassPaletteColor } from "@/lib/class-palette";

export function PlayerClassRatioCard({
  playerClass,
}: {
  playerClass: PlayerClassWithStats;
}) {
  const totalRatio = playerClass.totalRatio;

  if (playerClass.roles.length === 0 || totalRatio <= 0) {
    return null;
  }

  return (
    <div className="border-border/60 bg-muted/20 flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
          <Scales className="text-primary size-3.5 shrink-0" />
          <span>Équilibre défini par le staff</span>
        </span>
        <span className="text-muted-foreground truncate text-[11px]">
          {playerClass.roles.map((r) => `${r.ratio} ${r.name}`).join(" · ")}
        </span>
      </div>

      <div className="bg-muted/60 flex h-2.5 w-full overflow-hidden rounded-full p-0.5">
        {playerClass.roles.map((role, idx) => {
          const percentage = ((role.ratio / totalRatio) * 100).toFixed(1);
          const color = getClassPaletteColor(idx);
          return (
            <Tooltip key={role.id}>
              <TooltipTrigger
                render={
                  <div
                    style={{ width: `${(role.ratio / totalRatio) * 100}%` }}
                    className={`${color.bg} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:brightness-110`}
                  />
                }
              />
              <TooltipContent side="top" className="text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color.fill }}
                  />
                  <span className="font-semibold">{role.name}</span>
                  <span>
                    Ratio {role.ratio} ({percentage}%)
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs">
        {playerClass.roles.map((role, idx) => {
          const percentage = ((role.ratio / totalRatio) * 100).toFixed(0);
          const color = getClassPaletteColor(idx);
          return (
            <div key={role.id} className="flex items-center gap-1.5 text-[11px]">
              <span className={`size-1.5 rounded-full ${color.bg}`} />
              <span className="text-foreground/90">{role.name}</span>
              <span className="text-muted-foreground font-mono">({percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
