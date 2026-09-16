"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, Users } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SkinHead } from "@/components/ui/skin-head";
import { getClassPaletteColor, NEUTRAL_PALETTE_COLOR } from "@/lib/class-palette";
import { PlayerOverrideCell } from "@/components/staff/distribution/player-override-cell";
import type { SerializedPlayerClass } from "@/components/staff/distribution/player-class-card";
import type { PlayerAffiliationOverview } from "@/lib/services/player-affiliation-overview-service";

export function DistributionOverview({
  overview,
  playerClasses,
}: {
  overview: PlayerAffiliationOverview;
  playerClasses: SerializedPlayerClass[];
}) {
  const [search, setSearch] = useState("");

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return overview.players;
    return overview.players.filter((p) => p.playerName.toLowerCase().includes(q));
  }, [overview.players, search]);

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
          Répartition réelle des {overview.totalPlayers} joueur
          {overview.totalPlayers > 1 ? "s" : ""} ayant renseigné leur affiliation, selon le choix
          retenu par le staff (choix 1 par défaut).
        </p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 min-[1600px]:grid-cols-3">
          {overview.classes.map((classStat) => (
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

              {classStat.count > 0 ? (
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
                <p className="text-muted-foreground text-xs italic">Aucun joueur pour le moment.</p>
              )}
            </div>
          ))}
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
                <TableHead>Joueur</TableHead>
                <TableHead>Choix 1</TableHead>
                <TableHead>Choix 2</TableHead>
                <TableHead>Choix retenu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                    Aucun joueur ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((row) => (
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
                      />
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
