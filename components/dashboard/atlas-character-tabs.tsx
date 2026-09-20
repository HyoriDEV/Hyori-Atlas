"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CharacterSheetStatus, CharacterStatus } from "@/lib/generated/prisma/enums";
import { characterStatusLabels } from "@/lib/navigation";
import { characterStatusBadgeVariant } from "@/lib/atlas-status";
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
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Personnages ({characters.length})
        </span>
        {canManageCharacters && <AtlasCreateCharacterDialog playerId={playerId} pseudo={pseudo} />}
      </div>

      <div className="flex flex-col gap-1.5">
        {characters.map((char) => {
          const isSelected = char.id === selectedSheetId;
          const charName = char.name || "Sans nom";

          return (
            <div
              key={char.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
                isSelected
                  ? "border-primary/50 bg-primary/5 shadow-xs"
                  : "border-border/60 hover:border-border hover:bg-muted/30 cursor-pointer"
              )}
              onClick={() => {
                if (!isSelected) handleSelect(char.id);
              }}
            >
              <span
                className={cn(
                  "truncate text-sm",
                  isSelected ? "text-primary font-semibold" : "font-medium"
                )}
              >
                {charName}
              </span>

              <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                {canManageCharacters ? (
                  <AtlasCharacterStatusSelect
                    sheetId={char.id}
                    currentStatus={char.status}
                    characterName={charName}
                  />
                ) : (
                  <Badge
                    variant={characterStatusBadgeVariant(char.status)}
                    className="px-2 py-0.5 text-xs"
                  >
                    {characterStatusLabels[char.status]}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
