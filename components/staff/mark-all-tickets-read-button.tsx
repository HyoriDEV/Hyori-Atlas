"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markAllStaffTicketsAsRead } from "@/lib/actions/ticket-actions";

export function MarkAllTicketsReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkAll = () => {
    startTransition(async () => {
      try {
        const result = await markAllStaffTicketsAsRead();
        if (result.count > 0) {
          toast.success(`${result.count} ticket(s) marqué(s) comme lu(s).`);
        } else {
          toast.info("Tous les tickets sont déjà marqués comme lus.");
        }
        router.refresh();
      } catch {
        toast.error("Erreur lors du marquage des tickets.");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAll}
      disabled={isPending}
      className="h-9 gap-1.5 text-xs font-medium"
      title="Tout marquer comme lu"
    >
      {isPending ? (
        <CircleNotch className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5" />
      )}
      <span>Tout marquer comme lu</span>
    </Button>
  );
}
