import Link from "next/link";
import {
  Flag,
  CalendarBlank,
  IdentificationCard,
  Ticket,
  PenNib,
  ChatCircle,
  ClockCountdown,
  UsersThree,
  ShieldWarning,
  Info,
  SquaresFour,
  User,
  Shield,
  LockSimple,
  ArrowRight,
  Gear,
  Newspaper,
  BookBookmark,
  Scroll,
  Scales,
  ChartBar,
  Gavel,
  Kanban,
} from "@phosphor-icons/react/dist/ssr";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { NavIconKey } from "@/lib/navigation";
import { Badge, badgeVariants } from "@/components/ui/badge";

const iconMap: Record<NavIconKey | "user" | "shield-check", typeof Flag> = {
  flag: Flag,
  calendar: CalendarBlank,
  "id-card": IdentificationCard,
  ticket: Ticket,
  pen: PenNib,
  chat: ChatCircle,
  clock: ClockCountdown,
  users: UsersThree,
  shield: ShieldWarning,
  info: Info,
  "squares-four": SquaresFour,
  user: User,
  "shield-check": Shield,
  gear: Gear,
  newspaper: Newspaper,
  "book-bookmark": BookBookmark,
  scroll: Scroll,
  scales: Scales,
  chart: ChartBar,
  gavel: Gavel,
  kanban: Kanban,
};

export interface DashboardStatCardProps {
  title: string;
  description: string;
  href?: string;
  iconKey: NavIconKey | "user" | "shield-check";
  stat?: string | number | null;
  statLabel?: string | null;
  badge?: {
    label: string;
    variant?: VariantProps<typeof badgeVariants>["variant"];
    className?: string;
  };
  hasNotification?: boolean;
  locked?: boolean;
  lockedDescription?: string;
  highlight?: boolean;
  compact?: boolean;
  className?: string;
}

export function DashboardStatCard({
  title,
  description,
  href,
  iconKey,
  stat,
  statLabel,
  badge,
  hasNotification,
  locked = false,
  lockedDescription,
  highlight = false,
  compact = false,
  className,
}: DashboardStatCardProps) {
  const Icon = iconMap[iconKey] ?? Info;

  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between rounded-xl border transition-all duration-200",
        compact ? "p-3 sm:p-3.5" : "p-4.5",
        locked
          ? "border-border/70 bg-card/40 cursor-not-allowed border-dashed opacity-70"
          : "border-border bg-card hover:border-primary/40 hover:bg-card/90 hover:shadow-primary/5 cursor-pointer hover:shadow-md",
        highlight && !locked && "border-primary/30 bg-primary/5 shadow-xs",
        className
      )}
    >
      <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg border transition-colors",
                compact ? "size-7.5" : "size-9",
                locked
                  ? "border-muted bg-muted/40 text-muted-foreground"
                  : highlight
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-border bg-muted/30 text-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary"
              )}
            >
              <Icon className={cn(compact ? "size-3.5" : "size-4.5", "shrink-0")} />
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                className={cn(
                  "font-heading text-foreground font-semibold tracking-tight truncate",
                  compact ? "text-sm" : "text-base"
                )}
              >
                {title}
              </h3>
              {hasNotification && (
                <span className="bg-primary size-2 shrink-0 animate-pulse rounded-full" />
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {badge && (
              <Badge
                variant={badge.variant ?? "secondary"}
                className={cn(
                  "shrink-0 font-medium",
                  compact ? "px-1.5 py-0 text-[10px]" : "text-[11px]",
                  badge.className
                )}
              >
                {badge.label}
              </Badge>
            )}
            {locked && !badge && (
              <Badge
                variant="outline"
                className={cn("text-muted-foreground shrink-0 gap-1", compact ? "text-[10px]" : "text-[11px]")}
              >
                <LockSimple className={compact ? "size-2.5" : "size-3"} />
                <span>Verrouillé</span>
              </Badge>
            )}
          </div>
        </div>

        <p
          className={cn(
            "text-muted-foreground leading-relaxed",
            compact ? "line-clamp-1 text-xs" : "line-clamp-2 text-sm"
          )}
        >
          {locked && lockedDescription ? lockedDescription : description}
        </p>
      </div>

      <div
        className={cn(
          "border-border/50 flex items-center justify-between border-t",
          compact ? "mt-2 pt-2 min-h-5" : "mt-4 pt-3 min-h-7"
        )}
      >
        {stat !== undefined && stat !== null ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "font-heading text-foreground tracking-tight",
                compact
                  ? typeof stat === "number"
                    ? "text-base font-bold"
                    : "text-xs font-semibold"
                  : typeof stat === "number"
                    ? "text-lg font-bold"
                    : "text-sm font-semibold"
              )}
            >
              {stat}
            </span>
            {statLabel && (
              <span className="text-muted-foreground truncate text-xs font-medium">
                {statLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="min-w-0" />
        )}

        {!locked && href && (
          <div className="text-muted-foreground group-hover:text-primary ml-auto flex shrink-0 items-center gap-1 font-medium transition-colors">
            <span className={compact ? "text-[11px]" : "text-xs"}>Accéder</span>
            <ArrowRight
              className={cn(compact ? "size-3" : "size-3.5", "transition-transform group-hover:translate-x-0.5")}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (locked || !href) {
    return content;
  }

  return (
    <Link href={href} className="flex h-full flex-col focus:outline-hidden">
      {content}
    </Link>
  );
}
