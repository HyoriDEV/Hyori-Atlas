"use client";

import { Scales } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlayerClassWithStats } from "@/lib/services/player-class-service";

const PALETTE = [
  { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30", fill: "#f59e0b" },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    fill: "#10b981",
  },
  { bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500/30", fill: "#0ea5e9" },
  { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30", fill: "#8b5cf6" },
  { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30", fill: "#f43f5e" },
  { bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/30", fill: "#6366f1" },
  { bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-500/30", fill: "#14b8a6" },
  { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", fill: "#f97316" },
  { bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500/30", fill: "#06b6d4" },
  {
    bg: "bg-fuchsia-500",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500/30",
    fill: "#d946ef",
  },
];

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
          const color = PALETTE[idx % PALETTE.length];
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
          const color = PALETTE[idx % PALETTE.length];
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
