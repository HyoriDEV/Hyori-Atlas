import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-heading text-foreground text-base font-semibold tracking-tight">
            {title}
          </h3>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ChartEmptyState({ children }: { children?: ReactNode }) {
  return (
    <div className="border-border/60 text-muted-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center text-sm">
      {children ?? "Pas encore de données sur cette période."}
    </div>
  );
}

export function StatisticsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-foreground text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
