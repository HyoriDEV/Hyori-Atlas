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
    return (
      <TooltipProvider delay={300}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={isHandled ? "ghost" : "outline"}
                size="sm"
                onClick={handleToggle}
                disabled={isPending}
                className={cn(
                  "size-8 p-0 transition-colors",
                  isHandled
                    ? "text-muted-foreground hover:text-foreground"
                    : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
                  className
                )}
                aria-label={
                  isHandled ? "Marquer le suivi comme à traiter" : "Marquer le suivi comme traité"
                }
              >
                {isHandled ? (
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
              </Button>
            }
          />
          <TooltipContent side="top">
            {isHandled
              ? "Traité — Cliquer pour repasser en attente"
              : "Marquer comme traité sans répondre"}
          </TooltipContent>
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
