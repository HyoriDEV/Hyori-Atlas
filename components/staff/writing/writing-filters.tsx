"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowCounterClockwise, MagnifyingGlass, X } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { StaffWritingSort } from "@/lib/services/staff-writing-service";
import { setClientPagePref } from "@/lib/table-preferences";

const QUERY_DEBOUNCE_MS = 400;
const TRANSIENT_PARAMS = new Set(["q", "page"]);

const sortItems: { value: StaffWritingSort; label: string }[] = [
  { value: "updatedAt", label: "Dernière modification" },
  { value: "words", label: "Volume de mots (décroissant)" },
  { value: "chapters", label: "Nombre de chapitres" },
  { value: "player", label: "Nom du joueur (A-Z)" },
];

export function WritingFilters({ query, sort }: { query: string; sort: StaffWritingSort }) {
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
    const prefsToUpdate: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "sort" && value === "updatedAt")) {
        params.set(key, value);
        if (!TRANSIENT_PARAMS.has(key)) {
          prefsToUpdate[key] = value;
        }
      } else {
        params.delete(key);
        if (!TRANSIENT_PARAMS.has(key)) {
          prefsToUpdate[key] = undefined;
        }
      }
    }

    if (Object.keys(prefsToUpdate).length > 0) {
      setClientPagePref(pathname, prefsToUpdate);
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

  function handleResetAll() {
    setQueryInput("");
    setLastDispatchedQuery("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    updateParams({ q: undefined, sort: "updatedAt" });
  }

  const isFiltered = Boolean(query) || sort !== "updatedAt";

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche texte */}
        <div className="relative">
          <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={queryInput}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Rechercher par joueur, personnage, titre..."
            className="w-80 pr-8 pl-8 sm:w-[350px]"
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

        {/* Tri */}
        <Select
          items={sortItems}
          value={sort}
          onValueChange={(val) => updateParams({ sort: val as StaffWritingSort })}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Trier par">
              {sortItems.find((item) => item.value === sort)?.label ?? "Trier par"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bouton réinitialiser */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
          >
            <ArrowCounterClockwise className="size-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
