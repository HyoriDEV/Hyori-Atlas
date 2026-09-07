"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { CharacterStatus } from "@/lib/generated/prisma/enums";
import { characterStatusLabels } from "@/lib/navigation";
import { updateCharacterStatus } from "@/lib/actions/staff-character-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AtlasCharacterStatusSelect({
  sheetId,
  currentStatus,
  characterName,
  disabled = false,
}: {
  sheetId: string;
  currentStatus: CharacterStatus;
  characterName: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: string | null) {
    if (!newStatus || newStatus === currentStatus) return;
    const statusEnum = newStatus as CharacterStatus;

    startTransition(async () => {
      try {
        await updateCharacterStatus(sheetId, statusEnum);
        toast.success(
          `Statut de « ${characterName} » changé en : ${characterStatusLabels[statusEnum]}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Une erreur est survenue.";
        toast.error(message);
      }
    });
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="h-8 w-[140px] text-xs font-medium">
        <SelectValue placeholder="Changer le statut" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={CharacterStatus.ACTIVE}>
          <span className="font-medium text-emerald-500 dark:text-emerald-400">Actif</span>
        </SelectItem>
        <SelectItem value={CharacterStatus.DEAD}>
          <span className="font-medium text-destructive">Mort</span>
        </SelectItem>
        <SelectItem value={CharacterStatus.DISABLED}>
          <span className="font-medium text-muted-foreground">Désactivé</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
