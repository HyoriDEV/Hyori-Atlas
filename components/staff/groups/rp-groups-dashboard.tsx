"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Users, X } from "@phosphor-icons/react";

import { computeGroupStats, type RpGroupWithMembers } from "@/lib/rp-groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RpGroupCard } from "./rp-group-card";
import { CreateRpGroupDialog } from "./create-rp-group-dialog";
import type { PlayerOption } from "@/components/player-select";

interface RpGroupsDashboardProps {
  groups: RpGroupWithMembers[];
  availablePlayers: PlayerOption[];
  canManageGroups?: boolean;
}

export function RpGroupsDashboard({
  groups,
  availablePlayers,
  canManageGroups = true,
}: RpGroupsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pre-calculate stats for each group
  const groupsWithStats = useMemo(() => {
    return groups.map((group) => ({
      group,
      stats: computeGroupStats(group.members),
    }));
  }, [groups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return groupsWithStats.filter(({ group, stats }) => {
      // Status filter
      if (statusFilter !== "ALL" && stats.status !== statusFilter) {
        return false;
      }

      // Search query: match group name, description, or any member pseudo/rp name
      if (q) {
        const matchesName = group.name.toLowerCase().includes(q);
        const matchesDesc = group.description?.toLowerCase().includes(q) ?? false;
        const matchesMember = group.members.some((m) => {
          const mc = m.minecraftUsername?.toLowerCase() ?? "";
          const discordName = m.discordDisplayName.toLowerCase();
          const discordUser = m.discordUsername.toLowerCase();
          const rpName = m.activeSheet?.name.toLowerCase() ?? "";
          return (
            mc.includes(q) ||
            discordName.includes(q) ||
            discordUser.includes(q) ||
            rpName.includes(q)
          );
        });

        if (!matchesName && !matchesDesc && !matchesMember) {
          return false;
        }
      }

      return true;
    });
  }, [groupsWithStats, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Groupes RP</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Suivez l&apos;avancement de la whitelist des équipes de joueurs pour éviter de les
            bloquer.
          </p>
        </div>

        {canManageGroups && <CreateRpGroupDialog availablePlayers={availablePlayers} />}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par groupe ou joueur..."
            className="h-9 pr-8 pl-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm whitespace-nowrap">Filtrer par :</span>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
            <SelectTrigger className="h-9 w-[190px] text-sm">
              <SelectValue placeholder="Tous les états" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les états</SelectItem>
              <SelectItem value="READY_FOR_WHITELIST">Prêts pour validation</SelectItem>
              <SelectItem value="PENDING_REVIEW">Fiches à évaluer</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours de rédaction</SelectItem>
              <SelectItem value="ALL_WHITELISTED">Tous whitelistés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <Card className="text-muted-foreground flex flex-col items-center justify-center p-12 text-center">
          <Users className="mb-3 size-12 stroke-[1] opacity-40" />
          <h3 className="font-heading text-foreground text-base font-semibold">
            {groups.length === 0
              ? "Aucun groupe RP créé pour le moment"
              : "Aucun groupe ne correspond à vos critères"}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            {groups.length === 0
              ? "Créez votre premier groupe RP pour rassembler les joueurs et coordonner leur passage en whitelist."
              : "Essayez de modifier votre recherche ou de réinitialiser vos filtres."}
          </p>
          {groups.length === 0 ? (
            canManageGroups && (
              <div className="mt-4">
                <CreateRpGroupDialog availablePlayers={availablePlayers} />
              </div>
            )
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[1600px]:grid-cols-3 md:grid-cols-2">
          {filteredGroups.map(({ group }) => (
            <RpGroupCard
              key={group.id}
              group={group}
              availablePlayers={availablePlayers}
              canManageGroups={canManageGroups}
            />
          ))}
        </div>
      )}
    </div>
  );
}
