"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, MagnifyingGlass, UserMinus } from "@phosphor-icons/react";

import type { RetentionPlayerItem } from "@/lib/services/statistics/retention-stats";
import type { RetentionAlertStatus } from "@/lib/atlas-status";
import { retentionAlertBadgeConfig } from "@/lib/atlas-status";
import { Badge } from "@/components/ui/badge";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FilterType = "ALL" | RetentionAlertStatus;
type SortType = "severity" | "recentHours" | "lastSeen" | "totalHours";

interface RetentionTableClientProps {
  players: RetentionPlayerItem[];
  totalWhitelisted: number;
}

export function RetentionTableClient({ players, totalWhitelisted }: RetentionTableClientProps) {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("severity");

  // Filtrage
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (filter !== "ALL" && player.status !== filter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const mc = player.minecraftUsername?.toLowerCase() ?? "";
        const discord = player.discordDisplayName.toLowerCase();
        const discordTag = player.discordUsername.toLowerCase();
        if (!mc.includes(query) && !discord.includes(query) && !discordTag.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [players, filter, search]);

  // Tri
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      if (sort === "recentHours") {
        return b.recentHours - a.recentHours;
      }
      if (sort === "lastSeen") {
        return (b.daysSinceLastSeen ?? 999) - (a.daysSinceLastSeen ?? 999);
      }
      if (sort === "totalHours") {
        return b.totalHours - a.totalHours;
      }
      // Par défaut criticité
      const severityOrder: Record<RetentionAlertStatus, number> = {
        SEVERE_DROP: 1,
        ABNORMAL_ABSENCE: 2,
        GHOST: 3,
        CONFIRMED_INACTIVE: 4,
        HEALTHY: 5,
      };
      const diff = severityOrder[a.status] - severityOrder[b.status];
      if (diff !== 0) return diff;
      return (b.daysSinceLastSeen ?? 999) - (a.daysSinceLastSeen ?? 999);
    });
  }, [filteredPlayers, sort]);

  const countsByStatus = useMemo(() => {
    const map = {
      ALL: players.length,
      GHOST: 0,
      SEVERE_DROP: 0,
      ABNORMAL_ABSENCE: 0,
      CONFIRMED_INACTIVE: 0,
      HEALTHY: 0,
    };
    for (const p of players) {
      map[p.status] += 1;
    }
    return map;
  }, [players]);

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "ALL", label: "Toutes les alertes", count: countsByStatus.ALL },
    { key: "SEVERE_DROP", label: "🔻 Décrochage sévère", count: countsByStatus.SEVERE_DROP },
    { key: "ABNORMAL_ABSENCE", label: "⚠️ Absence anormale", count: countsByStatus.ABNORMAL_ABSENCE },
    { key: "GHOST", label: "👻 Nouveau fantôme", count: countsByStatus.GHOST },
    { key: "CONFIRMED_INACTIVE", label: "💤 Inactif confirmé", count: countsByStatus.CONFIRMED_INACTIVE },
  ];

  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Tableau d&apos;intervention prioritaire
          </h2>
          <p className="text-muted-foreground text-xs">
            {players.length} joueur{players.length > 1 ? "s" : ""} identifié{players.length > 1 ? "s" : ""} sur {totalWhitelisted} membres whitelistés
          </p>
        </div>

        {/* Recherche textuelle */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un pseudo..."
            className="border-input bg-background focus:ring-ring w-full rounded-lg border py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Raccourcis de filtrage par badge */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background/80"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}

        {/* Tri */}
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Trier par :</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="border-input bg-background rounded-md border px-2 py-1 text-xs"
          >
            <option value="severity">Criticité</option>
            <option value="recentHours">Heures récentes</option>
            <option value="lastSeen">Dernière connexion</option>
            <option value="totalHours">Heures totales</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Alerte</TableHead>
              <TableHead className="text-right">Heures récentes (7j)</TableHead>
              <TableHead className="text-right">Heures totales</TableHead>
              <TableHead className="text-right">Dernière connexion</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-1">
                    <UserMinus className="size-6 opacity-40" />
                    <p className="text-sm font-medium">Aucun joueur ne correspond à ce filtre.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedPlayers.map((player) => {
                const badgeConfig = retentionAlertBadgeConfig(player.status);
                return (
                  <TableRow key={player.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <SkinHead
                          username={player.minecraftUsername}
                          uuid={player.minecraftUuid}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">
                            {player.minecraftUsername ?? "Non lié"}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {player.discordDisplayName} (@{player.discordUsername})
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={badgeConfig.variant}
                        className={cn("text-xs", badgeConfig.className)}
                      >
                        {badgeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div className="flex flex-col items-end">
                        <span>{player.recentHours} h</span>
                        {player.dropPercentage !== null && player.dropPercentage > 0 && (
                          <span className="text-destructive text-[10px]">
                            -{player.dropPercentage}% vs sem. préc.
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {player.totalHours} h
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {player.lastConnectedAt ? (
                        <div className="flex flex-col items-end">
                          <span>
                            {player.daysSinceLastSeen === 0
                              ? "Aujourd'hui"
                              : `Il y a ${player.daysSinceLastSeen}j`}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(player.lastConnectedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Jamais</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/staff/atlas/${player.id}`}
                        prefetch={false}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center p-1.5 transition-colors"
                        title="Voir la fiche Atlas"
                      >
                        <ArrowSquareOut className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
