import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card flex min-w-0 flex-col gap-1 rounded-xl border p-4",
        className
      )}
    >
      <span className="text-muted-foreground truncate text-xs font-medium">{label}</span>
      <span className="font-heading text-foreground truncate text-2xl font-semibold tracking-tight">
        {value}
      </span>
    </div>
  );
}
