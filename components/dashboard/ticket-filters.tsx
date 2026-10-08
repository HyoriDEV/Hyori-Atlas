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
import { TicketCategory } from "@/lib/generated/prisma/enums";
import { staffRoleLabels, ticketCategoryLabels, ticketSummonableTeams } from "@/lib/navigation";
import { ResetSortButton } from "@/components/dashboard/waitlist-sort-controls";
import { setClientPagePref } from "@/lib/table-preferences";
import { TICKET_TEAM_FILTER_NONE } from "@/lib/ticket-list";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 400;
// Filtres ponctuels : jamais enregistrés dans les préférences de la page.
const TRANSIENT_PARAMS = new Set(["q"]);

const categoryItems = [
  { value: ALL_VALUE, label: "Toutes les catégories" },
  ...Object.values(TicketCategory).map((value) => ({ value, label: ticketCategoryLabels[value] })),
];

const teamItems = [
  { value: ALL_VALUE, label: "Tous les accès" },
  ...ticketSummonableTeams.map((team) => ({ value: team, label: staffRoleLabels[team] })),
  { value: TICKET_TEAM_FILTER_NONE, label: "Aucun accès accordé" },
];

export function TicketFilters({
  query,
  category,
  team,
  showTeamFilter = false,
  hasActiveSort = false,
}: {
  query: string;
  category?: string;
  team?: string;
  showTeamFilter?: boolean;
  hasActiveSort?: boolean;
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
    <div className="flex flex-wrap items-center gap-2">
      {hasActiveSort ? <ResetSortButton /> : null}

      <div className="relative">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Rechercher par intitulé ou joueur..."
          className="w-72 pr-8 pl-8"
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
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showTeamFilter ? (
        <Select
          items={teamItems}
          value={team ?? ALL_VALUE}
          onValueChange={(value) => updateParams({ team: value ?? ALL_VALUE })}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Accès staff" />
          </SelectTrigger>
          <SelectContent>
            {teamItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
