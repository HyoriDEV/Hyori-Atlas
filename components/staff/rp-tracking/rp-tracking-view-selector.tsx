"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User, Users } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { setClientPagePref } from "@/lib/table-preferences";

export function RpTrackingViewSelector({
  currentView,
  pendingGroupsCount = 0,
  pendingPlayersCount = 0,
}: {
  currentView: "players" | "groups";
  pendingGroupsCount?: number;
  pendingPlayersCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSelectView = (targetView: "players" | "groups") => {
    if (targetView === currentView) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", targetView);

    // Détermine si l'onglet cible "À traiter" est vide
    const willBeEmpty =
      targetView === "groups" ? pendingGroupsCount === 0 : pendingPlayersCount === 0;

    const currentTab = params.get("tab") || "pending";
    if (currentTab === "none" && targetView === "groups") {
      params.set("tab", willBeEmpty ? "handled" : "pending");
    } else if (currentTab === "pending" && willBeEmpty) {
      params.set("tab", "handled");
    }

    params.delete("page");

    setClientPagePref(pathname, {
      view: targetView,
      tab: params.get("tab") || undefined,
    });

    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="bg-muted inline-flex items-center rounded-lg p-1 text-xs">
      <button
        type="button"
        onClick={() => handleSelectView("players")}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
          currentView === "players"
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
          isPending && "opacity-70"
        )}
      >
        <User className="size-3.5" />
        <span>Suivis individuels</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelectView("groups")}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
          currentView === "groups"
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
          isPending && "opacity-70"
        )}
      >
        <Users className="size-3.5" />
        <span>Suivis de groupe</span>
      </button>
    </div>
  );
}
