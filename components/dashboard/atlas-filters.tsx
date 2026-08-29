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
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels, registrationStatusLabels } from "@/lib/navigation";
import { ResetSortButton } from "@/components/dashboard/waitlist-sort-controls";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 200;

const statusItems = [
  { value: ALL_VALUE, label: "Tous les statuts" },
  {
    value: RegistrationStatus.WHITELISTED,
    label: registrationStatusLabels[RegistrationStatus.WHITELISTED],
  },
  {
    value: RegistrationStatus.NEW,
    label: registrationStatusLabels[RegistrationStatus.NEW],
  },
  {
    value: RegistrationStatus.WAITLIST,
    label: registrationStatusLabels[RegistrationStatus.WAITLIST],
  },
  {
    value: RegistrationStatus.WHITELIST_IN_PROGRESS,
    label: registrationStatusLabels[RegistrationStatus.WHITELIST_IN_PROGRESS],
  },
];

const sheetStatusItems = [
  { value: ALL_VALUE, label: "Toutes les fiches" },
  {
    value: CharacterSheetStatus.PENDING_STAFF,
    label: characterSheetStatusLabels[CharacterSheetStatus.PENDING_STAFF],
  },
  {
    value: CharacterSheetStatus.PENDING_PLAYER,
    label: characterSheetStatusLabels[CharacterSheetStatus.PENDING_PLAYER],
  },
  {
    value: CharacterSheetStatus.VALIDATED,
    label: characterSheetStatusLabels[CharacterSheetStatus.VALIDATED],
  },
  { value: "NONE", label: "Sans fiche" },
];

export function AtlasFilters({
  query,
  status,
  sheetStatus,
  hasActiveSort,
}: {
  query: string;
  status?: string;
  sheetStatus?: string;
  hasActiveSort?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prevQuery, setPrevQuery] = useState(query);
  const [queryInput, setQueryInput] = useState(query);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevQuery !== query) {
    setPrevQuery(query);
    setQueryInput(query);
  }

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
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
      updateParams({ q: value.trim() });
    }, QUERY_DEBOUNCE_MS);
  }

  function handleClearQuery() {
    setQueryInput("");
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
          placeholder="Rechercher par pseudo ou nom RP..."
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
        items={statusItems}
        value={status ?? ALL_VALUE}
        onValueChange={(value) => updateParams({ status: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Statut d'inscription" />
        </SelectTrigger>
        <SelectContent>
          {statusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={sheetStatusItems}
        value={sheetStatus ?? ALL_VALUE}
        onValueChange={(value) => updateParams({ sheetStatus: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Statut fiche RP" />
        </SelectTrigger>
        <SelectContent>
          {sheetStatusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
