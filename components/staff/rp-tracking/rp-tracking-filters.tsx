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
import {
  DEFAULT_RP_TRACKING_SORT,
  DEFAULT_RP_TRACKING_WRITING_EDITED_FILTER,
  RP_TRACKING_SORTS,
  RP_TRACKING_WRITING_EDITED_FILTERS,
  rpTrackingSortLabels,
  rpTrackingWritingEditedFilterLabels,
  type RpTrackingSort,
  type RpTrackingWritingEditedFilter,
} from "@/lib/rp-tracking";
import { setClientPagePref } from "@/lib/table-preferences";

const QUERY_DEBOUNCE_MS = 400;
const TRANSIENT_PARAMS = new Set(["q", "page"]);

export interface RpTrackingFiltersProps {
  query: string;
  writingEdited: RpTrackingWritingEditedFilter;
  sort: RpTrackingSort;
}

export function RpTrackingFilters({ query, writingEdited, sort }: RpTrackingFiltersProps) {
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
      if (
        value &&
        !(key === "writingEdited" && value === DEFAULT_RP_TRACKING_WRITING_EDITED_FILTER) &&
        !(key === "sort" && value === DEFAULT_RP_TRACKING_SORT)
      ) {
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
    updateParams({
      q: undefined,
      writingEdited: DEFAULT_RP_TRACKING_WRITING_EDITED_FILTER,
      sort: DEFAULT_RP_TRACKING_SORT,
    });
  }

  const isFiltered =
    Boolean(query) ||
    writingEdited !== DEFAULT_RP_TRACKING_WRITING_EDITED_FILTER ||
    sort !== DEFAULT_RP_TRACKING_SORT;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const writingEditedFilterItems = RP_TRACKING_WRITING_EDITED_FILTERS.map((editedFilter) => ({
    value: editedFilter,
    label: rpTrackingWritingEditedFilterLabels[editedFilter],
  }));

  const sortItems = RP_TRACKING_SORTS.map((sortOption) => ({
    value: sortOption,
    label: rpTrackingSortLabels[sortOption],
  }));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Recherche texte à gauche */}
      <div className="relative w-full sm:w-72">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Rechercher un joueur..."
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

      {/* Filtres secondaires et tri à droite */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtre Dernière modification de la trame */}
        <Select
          items={writingEditedFilterItems}
          value={writingEdited}
          onValueChange={(val) =>
            updateParams({ writingEdited: val as RpTrackingWritingEditedFilter })
          }
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Dernière modification de la trame">
              {rpTrackingWritingEditedFilterLabels[writingEdited]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RP_TRACKING_WRITING_EDITED_FILTERS.map((editedFilter) => (
              <SelectItem key={editedFilter} value={editedFilter}>
                {rpTrackingWritingEditedFilterLabels[editedFilter]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tri de la liste */}
        <Select
          items={sortItems}
          value={sort}
          onValueChange={(val) => updateParams({ sort: val as RpTrackingSort })}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Trier par">{rpTrackingSortLabels[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RP_TRACKING_SORTS.map((sortOption) => (
              <SelectItem key={sortOption} value={sortOption}>
                {rpTrackingSortLabels[sortOption]}
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
            title="Réinitialiser les filtres"
          >
            <ArrowCounterClockwise className="size-3.5" />
            <span className="hidden md:inline">Réinitialiser</span>
          </Button>
        )}
      </div>
    </div>
  );
}
