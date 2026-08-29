"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, ArrowsDownUp, ArrowCounterClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type SortDirection = "asc" | "desc";

interface SortControlBaseProps {
  currentSort: SortDirection;
  sortKey?: string;
  activeSortKey?: string;
  dirParamName?: string;
  keyParamName?: string;
  resetParamNames?: string[];
  defaultDirection?: SortDirection;
}

function buildNextSortParams(
  searchParams: URLSearchParams,
  {
    nextDir,
    sortKey,
    dirParamName,
    keyParamName,
    resetParamNames,
  }: {
    nextDir: SortDirection;
    sortKey?: string;
    dirParamName: string;
    keyParamName: string;
    resetParamNames: string[];
  }
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set(dirParamName, nextDir);
  if (sortKey) {
    params.set(keyParamName, sortKey);
  }
  for (const paramName of resetParamNames) {
    params.set(paramName, "1");
  }
  return params;
}

function useSortNavigation({
  currentSort,
  sortKey,
  activeSortKey,
  dirParamName = "sort",
  keyParamName = "sortBy",
  resetParamNames = ["page", "rejectedPage"],
  defaultDirection = "asc",
}: SortControlBaseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = sortKey === undefined || activeSortKey === sortKey;
  const nextDir: SortDirection = isActive
    ? currentSort === "desc"
      ? "asc"
      : "desc"
    : defaultDirection;

  function toggleSort() {
    const params = buildNextSortParams(searchParams, {
      nextDir,
      sortKey,
      dirParamName,
      keyParamName,
      resetParamNames,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return { toggleSort, isActive };
}

export function SortToggle(props: SortControlBaseProps) {
  const { toggleSort, isActive } = useSortNavigation(props);
  const showingDesc = isActive && props.currentSort === "desc";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleSort}
      className="gap-1.5 text-xs"
      title="Changer l'ordre de tri"
    >
      <ArrowsDownUp className="size-3.5" />
      <span>{showingDesc ? "Plus récents d'abord" : "Plus anciens d'abord"}</span>
    </Button>
  );
}

interface SortHeaderProps extends SortControlBaseProps {
  label?: string;
}

export function SortHeader({ label = "Date d'entrée", ...props }: SortHeaderProps) {
  const { toggleSort, isActive } = useSortNavigation(props);
  const showingDesc = isActive && props.currentSort === "desc";

  return (
    <button
      type="button"
      onClick={toggleSort}
      className="group/sort text-foreground/90 hover:text-foreground flex cursor-pointer items-center gap-1.5 font-semibold transition-colors select-none"
      title={`Trier (${showingDesc ? "Décroissant" : "Croissant"})`}
    >
      <span>{label}</span>
      {isActive ? (
        showingDesc ? (
          <CaretDown className="text-foreground size-3.5" />
        ) : (
          <CaretUp className="text-foreground size-3.5" />
        )
      ) : (
        <CaretDown className="text-foreground/30 size-3.5" />
      )}
    </button>
  );
}

export function ResetSortButton({
  dirParamName = "dir",
  keyParamName = "sort",
  resetParamNames = ["page"],
  label = "Réinitialiser le tri",
  className,
}: {
  dirParamName?: string;
  keyParamName?: string;
  resetParamNames?: string[];
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleReset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(dirParamName);
    params.delete(keyParamName);
    for (const paramName of resetParamNames) {
      params.set(paramName, "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReset}
      className={className ?? "gap-1.5 text-xs"}
      title={label}
    >
      <ArrowCounterClockwise className="size-3.5" />
      <span>{label}</span>
    </Button>
  );
}
