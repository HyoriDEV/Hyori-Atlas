"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, ArrowsDownUp } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

interface SortToggleProps {
  currentSort: "asc" | "desc";
}

export function SortToggle({ currentSort }: SortToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggleSort() {
    const nextSort = currentSort === "desc" ? "asc" : "desc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextSort);
    params.set("page", "1");
    params.set("rejectedPage", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleSort}
      className="text-xs gap-1.5"
      title="Changer l'ordre de tri"
    >
      <ArrowsDownUp className="size-3.5" />
      <span>{currentSort === "desc" ? "Plus récents d'abord" : "Plus anciens d'abord"}</span>
    </Button>
  );
}

interface SortHeaderProps {
  currentSort: "asc" | "desc";
  label?: string;
}

export function SortHeader({ currentSort, label = "Date d'entrée" }: SortHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggleSort() {
    const nextSort = currentSort === "desc" ? "asc" : "desc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextSort);
    params.set("page", "1");
    params.set("rejectedPage", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={toggleSort}
      className="group/sort flex items-center gap-1.5 font-semibold text-foreground/90 hover:text-foreground transition-colors cursor-pointer select-none"
      title={`Trier (${currentSort === "desc" ? "Plus récents d'abord" : "Plus anciens d'abord"})`}
    >
      <span>{label}</span>
      {currentSort === "desc" ? (
        <CaretDown className="size-3.5 text-foreground" />
      ) : (
        <CaretUp className="size-3.5 text-foreground" />
      )}
    </button>
  );
}
