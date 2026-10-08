"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";

const QUERY_DEBOUNCE_MS = 400;

export function RpTrackingSearch({ query }: { query: string }) {
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
    // Ne resynchronise le champ que si la recherche a changé hors saisie (navigation, retour).
    if (query !== lastDispatchedQuery) {
      setQueryInput(query);
      setLastDispatchedQuery(query);
    }
  }

  function dispatchQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
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
      dispatchQuery(trimmed);
    }, QUERY_DEBOUNCE_MS);
  }

  function handleClearQuery() {
    setQueryInput("");
    setLastDispatchedQuery("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    dispatchQuery("");
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        value={queryInput}
        onChange={(event) => handleQueryChange(event.target.value)}
        placeholder="Rechercher un joueur..."
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
  );
}
