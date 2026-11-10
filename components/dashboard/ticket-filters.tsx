"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResetSortButton } from "@/components/dashboard/waitlist-sort-controls";
import { setClientPagePref } from "@/lib/table-preferences";
import { formatTicketCategoryName } from "@/lib/navigation";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 400;
// Filtres ponctuels : jamais enregistrés dans les préférences de la page.
const TRANSIENT_PARAMS = new Set(["q"]);

export interface TicketFilterCategoryOption {
  value: string;
  label: string;
}

const DEFAULT_CATEGORY_ITEMS: TicketFilterCategoryOption[] = [
  { value: ALL_VALUE, label: "Toutes les catégories" },
  { value: "rp", label: "Ticket RP" },
  { value: "technique", label: "Ticket technique" },
];

export function TicketFilters({
  query,
  category,
  hasActiveSort = false,
  availableCategories,
}: {
  query: string;
  category?: string;
  hasActiveSort?: boolean;
  availableCategories?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prevQuery, setPrevQuery] = useState(query);
  const [queryInput, setQueryInput] = useState(query);
  const [lastDispatchedQuery, setLastDispatchedQuery] = useState(query);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryItems: TicketFilterCategoryOption[] =
    availableCategories && availableCategories.length > 0
      ? [
          { value: ALL_VALUE, label: "Toutes les catégories" },
          ...availableCategories.map((c) => ({
            value: c.slug,
            label: formatTicketCategoryName(c.name),
          })),
        ]
      : DEFAULT_CATEGORY_ITEMS;

  if (prevQuery !== query) {
    setPrevQuery(query);
    // Only synchronize local input if the query changed from an external source
    // (e.g. navigation, back/forward button). Do not overwrite active user typing.
    if (query !== lastDispatchedQuery) {
      setQueryInput(query);
      setLastDispatchedQuery(query);
    }
  }

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    const prefsToUpdate: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== ALL_VALUE) {
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {hasActiveSort ? <ResetSortButton /> : null}

      <div className="relative w-full sm:w-auto">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Rechercher par intitulé ou joueur..."
          className="w-full pr-8 pl-8 sm:w-80"
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

      <Select
        items={categoryItems}
        value={category ?? ALL_VALUE}
        onValueChange={(value) => updateParams({ category: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Type de ticket">
            {categoryItems.find((item) => item.value === (category ?? ALL_VALUE))?.label ??
              "Type de ticket"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
