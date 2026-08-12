"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { registrationStatusLabels, staffRoleLabels } from "@/lib/navigation";

const ALL_VALUE = "ALL";
const QUERY_DEBOUNCE_MS = 350;

export function AtlasFilters({
  query,
  status,
  role,
}: {
  query: string;
  status: string;
  role: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleQueryChange(value: string) {
    setQueryInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value });
    }, QUERY_DEBOUNCE_MS);
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
      <Input
        value={queryInput}
        onChange={(event) => handleQueryChange(event.target.value)}
        placeholder="Rechercher un joueur..."
        className="w-56"
      />
      <Select
        value={status}
        onValueChange={(value) => updateParams({ status: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les statuts</SelectItem>
          {Object.values(RegistrationStatus).map((value) => (
            <SelectItem key={value} value={value}>
              {registrationStatusLabels[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={role} onValueChange={(value) => updateParams({ role: value ?? ALL_VALUE })}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tous les rôles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les rôles</SelectItem>
          {Object.values(Role).map((value) => (
            <SelectItem key={value} value={value}>
              {staffRoleLabels[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
