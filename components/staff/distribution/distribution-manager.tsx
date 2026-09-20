"use client";

import { useMemo, useState } from "react";
import { Plus, MagnifyingGlass, Scales } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  PlayerClassCard,
  type SerializedPlayerClass,
} from "@/components/staff/distribution/player-class-card";
import { CreateClassDialog } from "@/components/staff/distribution/class-dialogs";

export function DistributionManager({
  initialClasses,
}: {
  initialClasses: SerializedPlayerClass[];
}) {
  const [search, setSearch] = useState("");
  const [createClassOpen, setCreateClassOpen] = useState(false);

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialClasses;

    return initialClasses.filter((c) => {
      const matchClassName = c.name.toLowerCase().includes(q);
      const matchRoleName = c.roles.some((r) => r.name.toLowerCase().includes(q));
      return matchClassName || matchRoleName;
    });
  }, [initialClasses, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Rechercher une classe ou un rôle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateClassOpen(true)} className="gap-2 shadow-xs" size="sm">
            <Plus className="size-4" />
            <span>Nouvelle classe</span>
          </Button>
        </div>
      </div>

      {initialClasses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
            <Scales className="size-7" />
          </div>
          <div className="flex flex-col items-center justify-center">
            <h2 className="font-heading text-foreground mt-4 text-lg font-semibold">
              Aucune classe de joueurs
            </h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Commencez par créer une première classe de joueur. Vous pourrez ensuite y associer les
              rôles correspondants et configurer leur équilibre via des ratios.
            </p>
          </div>
        </Card>
      ) : filteredClasses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Aucun résultat ne correspond à votre recherche &quot;{search}&quot;.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="text-primary mt-2 text-xs"
          >
            Effacer la recherche
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 min-[1600px]:grid-cols-3 lg:grid-cols-2">
          {filteredClasses.map((playerClass) => (
            <PlayerClassCard key={playerClass.id} playerClass={playerClass} />
          ))}
        </div>
      )}

      <CreateClassDialog open={createClassOpen} onOpenChange={setCreateClassOpen} />
    </div>
  );
}
