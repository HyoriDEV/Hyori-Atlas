"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CaretDown, CaretUp, CaretUpDown, MagnifyingGlass, Users } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SkinHead } from "@/components/ui/skin-head";
import { Checkbox } from "@/components/ui/checkbox";
import { getClassPaletteColor, NEUTRAL_PALETTE_COLOR } from "@/lib/class-palette";
import { PlayerOverrideCell } from "@/components/staff/distribution/player-override-cell";
import { toggleDistributionProcessedAction } from "@/lib/actions/player-affiliation-actions";
import type { SerializedPlayerClass } from "@/components/staff/distribution/player-class-card";
import type { PlayerAffiliationOverview } from "@/lib/services/player-affiliation-overview-service";

type SortColumn = "processed" | "player" | "choice1" | "choice2" | "effective";
type SortDirection = "asc" | "desc";

interface OverrideState {
  classId: string;
  className: string;
  roleId: string | null;
  roleName: string;
}

export function DistributionOverview({
  overview,
  playerClasses,
}: {
  overview: PlayerAffiliationOverview;
  playerClasses: SerializedPlayerClass[];
}) {
  const [search, setSearch] = useState("");
  const [processedState, setProcessedState] = useState<Record<string, boolean>>({});
  const [overrideState, setOverrideState] = useState<Record<string, OverrideState>>({});
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [, startTransition] = useTransition();

  // Derived players list with optimistic updates applied
  const players = useMemo(() => {
    return overview.players.map((p) => {
      const override = overrideState[p.sheetId];
      const isProcessed = processedState[p.sheetId] ?? p.distributionProcessed;
      return {
        ...p,
        distributionProcessed: isProcessed,
        ...(override
          ? {
              effectiveClassId: override.classId,
              effectiveClassName: override.className,
              effectiveRoleId: override.roleId,
              effectiveRoleName: override.roleName,
            }
          : {}),
      };
    });
  }, [overview.players, processedState, overrideState]);

  // Dynamically compute class statistics so any optimistic changes to Choix retenu
  // are immediately reflected in the top cards without waiting for network revalidation.
  const classStats = useMemo(() => {
    const total = players.length;

    return playerClasses.map((playerClass) => {
      // Total players assigned to this class (including "Autre" role, for phantom class total)
      const classPlayers = players.filter((p) => p.effectiveClassId === playerClass.id);
      const count = classPlayers.length;

      // Only players with an assigned role (excluding "Autre") for role percentages
      const classPlayersWithRole = classPlayers.filter((p) => p.effectiveRoleId !== null);
      const countWithRole = classPlayersWithRole.length;

      const roles = playerClass.roles.map((role) => {
        const roleCount = classPlayersWithRole.filter((p) => p.effectiveRoleId === role.id).length;
        return {
          id: role.id,
          name: role.name,
          count: roleCount,
          percentOfClass: countWithRole > 0 ? (roleCount / countWithRole) * 100 : 0,
          percentOfTotal: total > 0 ? (roleCount / total) * 100 : 0,
        };
      });

      return {
        id: playerClass.id,
        name: playerClass.name,
        count,
        percentOfTotal: total > 0 ? (count / total) * 100 : 0,
        roles,
      };
    });
  }, [players, playerClasses]);

  function handleToggleProcessed(sheetId: string, nextChecked: boolean) {
    setProcessedState((prev) => ({ ...prev, [sheetId]: nextChecked }));

    startTransition(async () => {
      const res = await toggleDistributionProcessedAction(sheetId, nextChecked);
      if (!res.success) {
        toast.error(res.error || "Impossible de mettre à jour le statut traité.");
        setProcessedState((prev) => ({ ...prev, [sheetId]: !nextChecked }));
      }
    });
  }

  function handleOverrideUpdate(
    sheetId: string,
    classId: string,
    className: string,
    roleId: string | null,
    roleName: string
  ) {
    setOverrideState((prev) => ({
      ...prev,
      [sheetId]: { classId, className, roleId, roleName },
    }));
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function renderSortIcon(column: SortColumn) {
    if (sortColumn !== column) {
      return <CaretUpDown className="text-muted-foreground/40 size-3.5" />;
    }
    if (sortDirection === "asc") {
      return <CaretUp className="text-primary size-3.5" weight="bold" />;
    }
    return <CaretDown className="text-primary size-3.5" weight="bold" />;
  }

  const processedPlayers = useMemo(() => {
    let list = players;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.playerName.toLowerCase().includes(q));
    }

    if (!sortColumn) {
      return list;
    }

    return [...list].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "processed":
          comparison = Number(a.distributionProcessed) - Number(b.distributionProcessed);
          break;
        case "player":
          comparison = a.playerName.localeCompare(b.playerName, "fr", { sensitivity: "base" });
          break;
        case "choice1": {
          // Tri basé UNIQUEMENT sur la classe
          const aClass = a.primaryClassName ?? "";
          const bClass = b.primaryClassName ?? "";
          comparison = aClass.localeCompare(bClass, "fr", { sensitivity: "base" });
          break;
        }
        case "choice2": {
          // Tri basé UNIQUEMENT sur la classe
          const aClass = a.secondaryClassName ?? "";
          const bClass = b.secondaryClassName ?? "";
          comparison = aClass.localeCompare(bClass, "fr", { sensitivity: "base" });
          break;
        }
        case "effective": {
          const aClass = a.effectiveClassName ?? "";
          const bClass = b.effectiveClassName ?? "";
          comparison = aClass.localeCompare(bClass, "fr", { sensitivity: "base" });
          if (comparison === 0) {
            comparison = a.effectiveRoleName.localeCompare(b.effectiveRoleName, "fr", {
              sensitivity: "base",
            });
          }
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [players, search, sortColumn, sortDirection]);

  if (overview.totalPlayers === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
          <Users className="size-7" />
        </div>
        <h2 className="font-heading text-foreground mt-4 text-lg font-semibold">
          Aucun choix renseigné
        </h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          Dès qu&apos;un joueur renseignera sa section Affiliation, sa répartition apparaîtra ici.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          Répartition réelle des {players.length} joueur
          {players.length > 1 ? "s" : ""} ayant renseigné leur affiliation, selon le choix retenu
          par le staff (choix 1 par défaut).
        </p>

        <div className="grid grid-cols-1 gap-5 min-[1600px]:grid-cols-3 lg:grid-cols-2">
          {classStats.map((classStat) => {
            const hasRolesWithCount = classStat.roles.some((r) => r.count > 0);

            return (
              <div
                key={classStat.id}
                className="border-border/60 bg-muted/20 flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground flex items-center gap-1.5 font-semibold">
                    <Users className="size-3.5 shrink-0" />
                    <span>{classStat.name}</span>
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {classStat.count} ({classStat.percentOfTotal.toFixed(0)}%)
                  </span>
                </div>

                {hasRolesWithCount ? (
                  <>
                    <div className="bg-muted/60 flex h-2.5 w-full overflow-hidden rounded-full p-0.5">
                      {classStat.roles.map((role, idx) => {
                        const color =
                          role.id === null ? NEUTRAL_PALETTE_COLOR : getClassPaletteColor(idx);
                        if (role.count === 0) return null;
                        return (
                          <Tooltip key={role.id ?? "unspecified"}>
                            <TooltipTrigger
                              render={
                                <div
                                  style={{ width: `${role.percentOfClass}%` }}
                                  className={`${color.bg} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:brightness-110`}
                                />
                              }
                            />
                            <TooltipContent side="top" className="text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: color.fill }}
                                />
                                <span className="font-semibold">{role.name}</span>
                                <span>
                                  {role.count} ({role.percentOfClass.toFixed(0)}%)
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs">
                      {classStat.roles.map((role, idx) => {
                        const color =
                          role.id === null ? NEUTRAL_PALETTE_COLOR : getClassPaletteColor(idx);
                        return (
                          <div key={role.id ?? "unspecified"} className="flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${color.bg}`} />
                            <span className="text-foreground/90">{role.name}</span>
                            <span className="text-muted-foreground font-mono">
                              ({role.count} — {role.percentOfClass.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Aucun joueur avec métier assigné pour le moment.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <Card className="gap-0 overflow-hidden border py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("player")}
                >
                  <div className="hover:text-foreground flex items-center gap-1.5">
                    <span>Joueur</span>
                    {renderSortIcon("player")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("choice1")}
                >
                  <div className="hover:text-foreground flex items-center gap-1.5">
                    <span>Choix 1</span>
                    {renderSortIcon("choice1")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("choice2")}
                >
                  <div className="hover:text-foreground flex items-center gap-1.5">
                    <span>Choix 2</span>
                    {renderSortIcon("choice2")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("effective")}
                >
                  <div className="hover:text-foreground flex items-center gap-1.5">
                    <span>Choix retenu</span>
                    {renderSortIcon("effective")}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[85px] cursor-pointer select-none"
                  onClick={() => handleSort("processed")}
                >
                  <div className="hover:text-foreground flex items-center gap-1.5">
                    <span>Traité</span>
                    {renderSortIcon("processed")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                    Aucun joueur ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              ) : (
                processedPlayers.map((row) => (
                  <TableRow key={row.sheetId}>
                    <TableCell>
                      <Link
                        href={`/staff/atlas/${row.playerId}`}
                        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                        title={`Voir la fiche Atlas de ${row.playerName}`}
                      >
                        <SkinHead size="sm" username={row.minecraftUsername ?? undefined} />
                        <span className="font-medium hover:underline">{row.playerName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.primaryClassName ? (
                        <span>
                          {row.primaryClassName} — {row.primaryRoleName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.secondaryClassName ? (
                        <span>
                          {row.secondaryClassName} — {row.secondaryRoleName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <PlayerOverrideCell
                        key={`${row.sheetId}:${row.effectiveClassId}:${row.effectiveRoleId ?? "none"}`}
                        row={row}
                        playerClasses={playerClasses}
                        isEditing={editingSheetId === row.sheetId}
                        onStartEdit={() => setEditingSheetId(row.sheetId)}
                        onStopEdit={() => setEditingSheetId(null)}
                        onOptimisticUpdate={handleOverrideUpdate}
                      />
                    </TableCell>
                    <TableCell className="w-[85px]">
                      <div className="flex items-center">
                        <Checkbox
                          checked={row.distributionProcessed}
                          onCheckedChange={(checked) =>
                            handleToggleProcessed(row.sheetId, checked === true)
                          }
                          aria-label={`Marquer ${row.playerName} comme traité`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
