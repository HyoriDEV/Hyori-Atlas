"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SanctionSource, SanctionType } from "@/lib/generated/prisma/enums";
import { sanctionSourceLabels, sanctionTypeLabels } from "@/lib/navigation";
import { ResetSortButton } from "@/components/dashboard/waitlist-sort-controls";
import { setClientPagePref } from "@/lib/table-preferences";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 400;

const typeFilterItems = [
  { value: ALL_VALUE, label: "Tous les types" },
  { value: SanctionType.WARNING, label: sanctionTypeLabels[SanctionType.WARNING] },
  { value: SanctionType.SUSPENSION, label: sanctionTypeLabels[SanctionType.SUSPENSION] },
  { value: SanctionType.EXCLUSION, label: sanctionTypeLabels[SanctionType.EXCLUSION] },
];

const statusFilterItems = [
  { value: ALL_VALUE, label: "Tous les statuts" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expirée" },
  { value: "REVOKED", label: "Levée" },
];

const sourceFilterItems = [
  { value: ALL_VALUE, label: "Toutes les sources" },
  { value: SanctionSource.WEB, label: sanctionSourceLabels[SanctionSource.WEB] },
  { value: SanctionSource.GAME, label: sanctionSourceLabels[SanctionSource.GAME] },
];

interface SanctionsFiltersProps {
  query: string;
  typeFilter?: string;
  statusFilter?: string;
  sourceFilter?: string;
  hasActiveSort?: boolean;
}

export function SanctionsFilters({
  query,
  typeFilter,
  statusFilter,
  sourceFilter,
  hasActiveSort = false,
}: SanctionsFiltersProps) {
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    const prefsToUpdate: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
        if (key !== "q") {
          prefsToUpdate[key] = value;
        }
      } else {
        params.delete(key);
        if (key !== "q") {
          prefsToUpdate[key] = undefined;
        }
      }
    }

    if (Object.keys(prefsToUpdate).length > 0) {
      setClientPagePref(pathname, prefsToUpdate);
    }

    params.set("page", "1");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
      updateParams({ q: trimmed });
    }, QUERY_DEBOUNCE_MS);
  }

  function handleClearQuery() {
    setQueryInput("");
    setLastDispatchedQuery("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    updateParams({ q: "" });
  }

  function handleResetFilters() {
    setQueryInput("");
    setLastDispatchedQuery("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    updateParams({
      q: "",
      type: ALL_VALUE,
      status: ALL_VALUE,
      source: ALL_VALUE,
    });
  }

  const hasActiveFilters = Boolean(
    queryInput.trim() ||
      (typeFilter && typeFilter !== ALL_VALUE) ||
      (statusFilter && statusFilter !== ALL_VALUE) ||
      (sourceFilter && sourceFilter !== ALL_VALUE)
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Barre de recherche */}
      <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-initial">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Rechercher (joueur, émetteur, raison)..."
          value={queryInput}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pr-8 pl-9"
        />
        {queryInput && (
          <button
            type="button"
            onClick={handleClearQuery}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-0.5"
            title="Effacer la recherche"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filtre par Type */}
      <Select
        value={typeFilter ?? ALL_VALUE}
        onValueChange={(val) => updateParams({ type: val ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tous les types" />
        </SelectTrigger>
        <SelectContent>
          {typeFilterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre par Statut */}
      <Select
        value={statusFilter ?? ALL_VALUE}
        onValueChange={(val) => updateParams({ status: val ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          {statusFilterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre par Source */}
      <Select
        value={sourceFilter ?? ALL_VALUE}
        onValueChange={(val) => updateParams({ source: val ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Toutes les sources" />
        </SelectTrigger>
        <SelectContent>
          {sourceFilterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Réinitialisation des filtres */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetFilters}
          className="text-muted-foreground hover:text-foreground h-9 gap-1.5 px-2.5 text-xs"
          title="Réinitialiser tous les filtres"
        >
          <X className="size-3.5" />
          <span>Effacer les filtres</span>
        </Button>
      )}

      {/* Réinitialisation du tri */}
      {hasActiveSort && (
        <ResetSortButton
          dirParamName="dir"
          keyParamName="sort"
          resetParamNames={["page"]}
        />
      )}
    </div>
  );
}
