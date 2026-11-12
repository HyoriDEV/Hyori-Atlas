"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowCounterClockwise, MagnifyingGlass, X } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/staff/rp-tracking/create-group-dialog";
import type { PlayerOption } from "@/components/player-select";

const QUERY_DEBOUNCE_MS = 400;

export function GroupTrackingFilters({
  query,
  availablePlayers,
}: {
  query: string;
  availablePlayers: PlayerOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prevQuery, setPrevQuery] = useState(query);
  const [queryInput, setQueryInput] = useState(query);
  const [lastDispatchedQuery, setLastDispatchedQuery] = useState(query);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevQuery !== query) {
    setPrevQuery(query);
    if (query !== lastDispatchedQuery) {
      setQueryInput(query);
      setLastDispatchedQuery(query);
    }
  }

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  function handleQueryChange(value: string) {
    setQueryInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      setLastDispatchedQuery(trimmed);
      updateParams({ q: trimmed || undefined });
    }, QUERY_DEBOUNCE_MS);
  }

  function handleClearQuery() {
    setQueryInput("");
    setLastDispatchedQuery("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    updateParams({ q: undefined });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isFiltered = Boolean(query);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Recherche texte */}
      <div className="relative w-full sm:w-72">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Rechercher un groupe, un membre..."
          className="w-full pr-8 pl-8"
        />
        {queryInput ? (
          <button
            type="button"
            onClick={handleClearQuery}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-0.5"
            title="Effacer la recherche"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearQuery}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
            title="Réinitialiser la recherche"
          >
            <ArrowCounterClockwise className="size-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
        )}

        <CreateGroupDialog availablePlayers={availablePlayers} />
      </div>
    </div>
  );
}
