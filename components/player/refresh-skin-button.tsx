"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshMySkinAction } from "@/lib/actions/minecraft-actions";

export function RefreshSkinButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await refreshMySkinAction();
        if (res.success) {
          toast.success("Skin Minecraft synchronisé avec succès !");
          router.refresh();
        } else {
          toast.error(res.error || "Impossible de synchroniser le skin.");
        }
      } catch {
        toast.error("Erreur lors de la synchronisation.");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={handleRefresh}
      disabled={isPending}
      className="text-muted-foreground hover:text-foreground text-xs"
      title="Synchroniser votre skin actuel depuis Mojang"
    >
      <ArrowsClockwise className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
      <span>{isPending ? "Synchronisation..." : "Actualiser le skin"}</span>
    </Button>
  );
}
