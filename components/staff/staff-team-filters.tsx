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
import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 200;

const roleFilterItems = [
  { value: ALL_VALUE, label: "Tous les pôles" },
  { value: Role.ADMIN, label: staffRoleLabels[Role.ADMIN] },
  { value: Role.COMMUNICATION, label: staffRoleLabels[Role.COMMUNICATION] },
  { value: Role.CONFLICT_MANAGEMENT, label: staffRoleLabels[Role.CONFLICT_MANAGEMENT] },
  { value: Role.RP_TRACKING, label: staffRoleLabels[Role.RP_TRACKING] },
  { value: Role.DEVELOPER, label: staffRoleLabels[Role.DEVELOPER] },
];

interface StaffTeamFiltersProps {
  query: string;
  roleFilter?: string;
}

export function StaffTeamFilters({ query, roleFilter }: StaffTeamFiltersProps) {
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

  function handleResetFilters() {
    setQueryInput("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasActiveFilters = Boolean(query || (roleFilter !== undefined && roleFilter !== ALL_VALUE));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 text-xs">
          Réinitialiser les filtres
        </Button>
      )}

      <div className="relative">
        <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Rechercher..."
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
        items={roleFilterItems}
        value={roleFilter ?? ALL_VALUE}
        onValueChange={(value) => updateParams({ role: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Filtrer par rôle" />
        </SelectTrigger>
        <SelectContent>
          {roleFilterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
