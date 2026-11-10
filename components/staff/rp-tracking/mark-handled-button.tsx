"use client";

import { useTransition } from "react";
import { Check, CheckCircle, ArrowsCounterClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";

import { markRpTrackingHandledAction } from "@/lib/actions/rp-tracking-actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MarkHandledButtonProps {
  conversationId: string;
  isHandled: boolean;
  playerName?: string;
  variant?: "table" | "header";
  className?: string;
}

export function MarkHandledButton({
  conversationId,
  isHandled,
  playerName,
  variant = "table",
  className,
}: MarkHandledButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const nextHandled = !isHandled;
      const res = await markRpTrackingHandledAction(conversationId, nextHandled);
      if (res.success) {
        toast.success(
          nextHandled
            ? `Suivi de ${playerName || "ce joueur"} marqué comme traité.`
            : `Suivi de ${playerName || "ce joueur"} marqué à traiter.`
        );
      } else {
        toast.error(res.error || "Impossible de modifier le statut.");
      }
    });
  };

  if (variant === "table") {
    const tooltipText = isHandled ? "Marquer à traiter" : "Marquer comme traité";

    return (
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                disabled={isPending}
                className={cn(
                  "size-8 p-0 transition-colors",
                  isHandled
                    ? "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600",
                  className
                )}
                aria-label={tooltipText}
              >
                {isPending ? (
                  <ArrowsCounterClockwise className="text-muted-foreground size-4 animate-spin" />
                ) : isHandled ? (
                  <CheckCircle weight="fill" className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
            }
          />
          <TooltipContent side="top">{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={isHandled ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "gap-2 text-xs font-medium",
        isHandled && "border-border text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {isHandled ? (
        <>
          <ArrowsCounterClockwise className={cn("size-3.5", isPending && "animate-spin")} />
          <span>Marquer à traiter</span>
        </>
      ) : (
        <>
          <CheckCircle className={cn("size-3.5", isPending && "animate-spin")} />
          <span>Marquer comme traité</span>
        </>
      )}
    </Button>
  );
}
