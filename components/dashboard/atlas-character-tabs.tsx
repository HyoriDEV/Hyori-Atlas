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
import { Card } from "@/components/ui/card";
import { AtlasCreateCharacterDialog } from "@/components/dashboard/atlas-create-character-dialog";
import { AtlasCharacterStatusSelect } from "@/components/dashboard/atlas-character-status-select";
import { cn } from "@/lib/utils";

export interface AtlasCharacterItem {
  id: string;
  name: string;
  status: CharacterStatus;
  reviewStatus: CharacterSheetStatus;
  createdAt: Date | string;
}

export function AtlasCharacterTabs({
  playerId,
  pseudo,
  characters,
  selectedSheetId,
  canManageCharacters = false,
}: {
  playerId: string;
  pseudo: string;
  characters: AtlasCharacterItem[];
  selectedSheetId: string;
  canManageCharacters?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(sheetId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sheetId", sheetId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Personnages ({characters.length})
          </span>
        </div>
        {canManageCharacters && (
          <AtlasCreateCharacterDialog playerId={playerId} pseudo={pseudo} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {characters.map((char) => {
          const isSelected = char.id === selectedSheetId;
          const charName = char.name || "Sans nom";

          return (
            <div
              key={char.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-primary/50 bg-primary/5 shadow-xs"
                  : "border-border/60 hover:border-border hover:bg-muted/30 cursor-pointer"
              )}
              onClick={() => {
                if (!isSelected) handleSelect(char.id);
              }}
            >
              <div className="flex items-center gap-2.5">
                {char.status === CharacterStatus.ACTIVE && (
                  <CheckCircle className="text-emerald-500 size-4 shrink-0" />
                )}
                {char.status === CharacterStatus.DEAD && (
                  <Skull className="text-destructive size-4 shrink-0" />
                )}
                {char.status === CharacterStatus.DISABLED && (
                  <Prohibit className="text-muted-foreground size-4 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{charName}</span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Badge
                      variant={characterStatusBadgeVariant(char.status)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {characterStatusLabels[char.status]}
                    </Badge>
                    <Badge
                      variant={characterSheetStatusBadgeVariant(char.reviewStatus)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {characterSheetStatusLabels[char.reviewStatus]}
                    </Badge>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {canManageCharacters && (
                  <AtlasCharacterStatusSelect
                    sheetId={char.id}
                    currentStatus={char.status}
                    characterName={charName}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
