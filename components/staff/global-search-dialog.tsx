"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { MagnifyingGlass, Ticket, X, CircleNotch } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkinHead } from "@/components/ui/skin-head";
import {
  globalSearchAction,
  type GlobalSearchPlayerResult,
  type GlobalSearchTicketResult,
} from "@/lib/actions/search-actions";

const QUERY_DEBOUNCE_MS = 400;

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<GlobalSearchPlayerResult[]>([]);
  const [tickets, setTickets] = useState<GlobalSearchTicketResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setQuery("");
      setPlayers([]);
      setTickets([]);
      setHasSearched(false);
      setIsLoading(false);
    }
    onOpenChange(nextOpen);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setPlayers([]);
      setTickets([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const currentRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearchAction(trimmed);
        if (currentRequestId === requestIdRef.current) {
          setPlayers(results.players);
          setTickets(results.tickets);
          setHasSearched(true);
        }
      } catch {
        if (currentRequestId === requestIdRef.current) {
          setPlayers([]);
          setTickets([]);
          setHasSearched(true);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, QUERY_DEBOUNCE_MS);
  }

  function handleClear() {
    handleQueryChange("");
  }

  function handleSelectPlayer(id: string) {
    handleOpenChange(false);
    startTransition(() => {
      router.push(`/staff/atlas/${id}`);
    });
  }

  function handleSelectTicket(id: string) {
    handleOpenChange(false);
    startTransition(() => {
      router.push(`/staff/tickets/${id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-border/80 bg-popover top-16 max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl sm:top-20 sm:max-w-2xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche générale</DialogTitle>
          <DialogDescription>
            Recherche de joueurs dans l&apos;atlas et de tickets staff
          </DialogDescription>
        </DialogHeader>

        <CommandPrimitive
          shouldFilter={false}
          className="bg-popover text-popover-foreground flex size-full flex-col overflow-hidden outline-none"
        >
          {/* Champ de recherche */}
          <div className="border-border/60 flex items-center border-b px-4 py-3">
            <MagnifyingGlass className="text-muted-foreground mr-3 size-4 shrink-0" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Rechercher un joueur ou un ticket..."
              className="placeholder:text-muted-foreground text-foreground flex w-full bg-transparent text-sm outline-none"
              autoFocus
            />
            {isLoading ? (
              <CircleNotch className="text-muted-foreground size-4 shrink-0 animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 transition-colors"
                title="Effacer"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Liste des résultats */}
          <CommandPrimitive.List className="no-scrollbar max-h-[60vh] overflow-y-auto p-2 outline-none sm:max-h-[420px]">
            {/* Guide avant 3 caractères */}
            {query.trim().length < 3 && (
              <div className="text-muted-foreground py-8 text-center text-xs select-none">
                Saisis au moins 3 caractères.
              </div>
            )}

            {/* Aucun résultat tous types confondus */}
            {!isLoading && hasSearched && players.length === 0 && tickets.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm select-none">
                Aucun résultat.
              </div>
            )}

            {/* Groupe Joueurs */}
            {players.length > 0 && (
              <CommandPrimitive.Group heading={undefined} className="overflow-hidden">
                <div className="mb-1.5 flex items-center px-2.5 py-1 select-none">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Joueurs
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {players.map((player) => (
                    <CommandPrimitive.Item
                      key={player.id}
                      value={`player-${player.id}-${player.label}`}
                      onSelect={() => handleSelectPlayer(player.id)}
                      onClick={() => handleSelectPlayer(player.id)}
                      className="data-selected:bg-muted data-selected:text-foreground hover:bg-muted/80 text-foreground flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none select-none"
                    >
                      <SkinHead
                        size="default"
                        username={player.minecraftUsername}
                        uuid={player.minecraftUuid}
                        avatarUrl={player.minecraftAvatarUrl}
                        updatedAt={player.minecraftSkinUpdatedAt}
                        fallback="?"
                        className="size-8 shrink-0 rounded-lg"
                      />
                      <span className="truncate text-sm font-medium">{player.label}</span>
                    </CommandPrimitive.Item>
                  ))}
                </div>
              </CommandPrimitive.Group>
            )}

            {/* Groupe Tickets */}
            {tickets.length > 0 && (
              <CommandPrimitive.Group
                heading={undefined}
                className={cn("overflow-hidden", players.length > 0 && "mt-3")}
              >
                <div className="mb-1.5 flex items-center px-2.5 py-1 select-none">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Tickets
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {tickets.map((ticket) => (
                    <CommandPrimitive.Item
                      key={ticket.id}
                      value={`ticket-${ticket.id}-${ticket.label}`}
                      onSelect={() => handleSelectTicket(ticket.id)}
                      onClick={() => handleSelectTicket(ticket.id)}
                      className="data-selected:bg-muted data-selected:text-foreground hover:bg-muted/80 text-foreground flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none select-none"
                    >
                      <div className="bg-muted text-muted-foreground border-border relative flex size-8 shrink-0 items-center justify-center rounded-lg border select-none">
                        <Ticket className="size-4 shrink-0" />
                      </div>
                      <span className="truncate text-sm font-medium">{ticket.label}</span>
                    </CommandPrimitive.Item>
                  ))}
                </div>
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>

          {/* Pied de la modale sobre avec rappels clavier */}
          <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-2 text-[11px] select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="border-border/70 bg-background/80 rounded border px-1 py-0.5 font-mono text-[10px]">
                  ↑
                </kbd>
                <kbd className="border-border/70 bg-background/80 rounded border px-1 py-0.5 font-mono text-[10px]">
                  ↓
                </kbd>
                <span>Naviguer</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border-border/70 bg-background/80 rounded border px-1.5 py-0.5 font-mono text-[10px]">
                  Entrée
                </kbd>
                <span>Ouvrir</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="border-border/70 bg-background/80 rounded border px-1.5 py-0.5 font-mono text-[10px]">
                Échap
              </kbd>
              <span>Fermer</span>
            </span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
