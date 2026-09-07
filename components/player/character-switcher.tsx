"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User, Skull, Prohibit, CheckCircle } from "@phosphor-icons/react";

import { CharacterSheetStatus, CharacterStatus } from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels, characterStatusLabels } from "@/lib/navigation";
import {
  characterSheetStatusBadgeVariant,
  characterStatusBadgeVariant,
} from "@/lib/atlas-status";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CharacterItemSummary {
  id: string;
  name: string;
  status: CharacterStatus;
  reviewStatus: CharacterSheetStatus;
  createdAt: Date | string;
}

export function CharacterSwitcher({
  characters,
  selectedCharacterId,
}: {
  characters: CharacterItemSummary[];
  selectedCharacterId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (characters.length <= 1) {
    return null;
  }

  function handleSelect(characterId: string | null) {
    if (!characterId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("characterId", characterId);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selected = characters.find((c) => c.id === selectedCharacterId) ?? characters[0];

  return (
    <div className="border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <User className="text-primary size-5" />
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs font-medium">Personnage sélectionné</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{selected.name || "Nouveau personnage"}</span>
            <Badge variant={characterStatusBadgeVariant(selected.status)} className="text-[10px] px-2 py-0.5">
              {characterStatusLabels[selected.status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground hidden text-xs sm:inline">Changer de personnage :</span>
        <Select value={selected.id} onValueChange={handleSelect}>
          <SelectTrigger className="h-9 min-w-[200px] text-xs sm:text-sm">
            <SelectValue placeholder="Choisir un personnage" />
          </SelectTrigger>
          <SelectContent align="end">
            {characters.map((character) => {
              const displayName = character.name || "Sans nom";
              return (
                <SelectItem key={character.id} value={character.id}>
                  <div className="flex items-center gap-2">
                    {character.status === CharacterStatus.ACTIVE && (
                      <CheckCircle className="text-primary size-3.5 shrink-0" />
                    )}
                    {character.status === CharacterStatus.DEAD && (
                      <Skull className="text-destructive size-3.5 shrink-0" />
                    )}
                    {character.status === CharacterStatus.DISABLED && (
                      <Prohibit className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <span className="font-medium">{displayName}</span>
                    <span className="text-muted-foreground text-xs">
                      ({characterStatusLabels[character.status]} — {characterSheetStatusLabels[character.reviewStatus]})
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
