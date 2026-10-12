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
  DEFAULT_RP_TRACKING_FILTER_STATUS,
  DEFAULT_RP_TRACKING_WRITING_FILTER,
  RP_TRACKING_FILTER_STATUSES,
  RP_TRACKING_WRITING_FILTERS,
  rpTrackingFilterStatusLabels,
  rpTrackingWritingFilterLabels,
  type RpTrackingFilterStatus,
  type RpTrackingWritingFilter,
} from "@/lib/rp-tracking";
import { setClientPagePref } from "@/lib/table-preferences";

const QUERY_DEBOUNCE_MS = 400;
const TRANSIENT_PARAMS = new Set(["q", "page"]);

export interface RpTrackingFiltersProps {
  query: string;
  status: RpTrackingFilterStatus;
  writing: RpTrackingWritingFilter;
  counts?: {
    pending: number;
    recent: number;
    dormant: number;
    none: number;
    ongoing: number;
    all: number;
  };
}

export function RpTrackingFilters({ query, status, writing, counts }: RpTrackingFiltersProps) {
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
        !(key === "status" && value === DEFAULT_RP_TRACKING_FILTER_STATUS) &&
        !(key === "writing" && value === DEFAULT_RP_TRACKING_WRITING_FILTER)
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
      status: DEFAULT_RP_TRACKING_FILTER_STATUS,
      writing: DEFAULT_RP_TRACKING_WRITING_FILTER,
    });
  }

  const isFiltered =
    Boolean(query) ||
    status !== DEFAULT_RP_TRACKING_FILTER_STATUS ||
    writing !== DEFAULT_RP_TRACKING_WRITING_FILTER;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const statusFilterItems = RP_TRACKING_FILTER_STATUSES.map((filterStatus) => ({
    value: filterStatus,
    label: rpTrackingFilterStatusLabels[filterStatus],
  }));

  const writingFilterItems = RP_TRACKING_WRITING_FILTERS.map((writingFilter) => ({
    value: writingFilter,
    label: rpTrackingWritingFilterLabels[writingFilter],
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche texte */}
        <div className="relative">
          <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={queryInput}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Rechercher un joueur..."
            className="w-64 pr-8 pl-8 sm:w-72"
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

        {/* Filtre État du suivi */}
        <Select
          items={statusFilterItems}
          value={status}
          onValueChange={(val) => updateParams({ status: val as RpTrackingFilterStatus })}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="État du suivi">
              {rpTrackingFilterStatusLabels[status]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RP_TRACKING_FILTER_STATUSES.map((filterStatus) => {
              const count = counts ? counts[filterStatus] : undefined;
              return (
                <SelectItem key={filterStatus} value={filterStatus}>
                  {rpTrackingFilterStatusLabels[filterStatus]}
                  {typeof count === "number" ? ` (${count})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Filtre Trame écrite */}
        <Select
          items={writingFilterItems}
          value={writing}
          onValueChange={(val) => updateParams({ writing: val as RpTrackingWritingFilter })}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Trame écrite">
              {rpTrackingWritingFilterLabels[writing]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RP_TRACKING_WRITING_FILTERS.map((writingFilter) => (
              <SelectItem key={writingFilter} value={writingFilter}>
                {rpTrackingWritingFilterLabels[writingFilter]}
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
