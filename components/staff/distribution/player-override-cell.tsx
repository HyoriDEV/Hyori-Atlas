"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setStaffOverrideChoiceAction } from "@/lib/actions/player-affiliation-actions";
import type { SerializedPlayerClass } from "@/components/staff/distribution/player-class-card";
import type { PlayerAffiliationRow } from "@/lib/services/player-affiliation-overview-service";

const UNSPECIFIED_ROLE_VALUE = "__unspecified__";

export function PlayerOverrideCell({
  row,
  playerClasses,
}: {
  row: PlayerAffiliationRow;
  playerClasses: SerializedPlayerClass[];
}) {
  // Remounted by the parent (via a key derived from the effective choice) whenever the
  // server-persisted value changes, so this local state never needs to resync in an effect.
  const [classId, setClassId] = useState(row.effectiveClassId);
  const [roleId, setRoleId] = useState<string | null>(row.effectiveRoleId);
  const [isPending, startTransition] = useTransition();

  const selectedClass = playerClasses.find((c) => c.id === classId) ?? null;

  function commit(nextClassId: string, nextRoleId: string | null) {
    setClassId(nextClassId);
    setRoleId(nextRoleId);

    const isChoice1 = nextClassId === row.primaryClassId && nextRoleId === row.primaryRoleId;

    startTransition(async () => {
      const res = await setStaffOverrideChoiceAction(row.sheetId, {
        classId: isChoice1 ? null : nextClassId,
        roleId: isChoice1 ? null : nextRoleId,
      });
      if (!res.success) {
        toast.error(res.error || "Impossible de mettre à jour le choix retenu.");
        setClassId(row.effectiveClassId);
        setRoleId(row.effectiveRoleId);
      }
    });
  }

  function handleClassChange(newClassId: string) {
    if (!newClassId) return;
    commit(newClassId, null);
  }

  function handleRoleChange(newRoleId: string) {
    commit(classId, newRoleId === UNSPECIFIED_ROLE_VALUE ? null : newRoleId);
  }

  const isOnChoice1 = classId === row.primaryClassId && roleId === row.primaryRoleId;
  const isOnChoice2 =
    row.secondaryClassId != null &&
    classId === row.secondaryClassId &&
    roleId === row.secondaryRoleId;

  const showChoice1Button = row.primaryClassId != null && !isOnChoice1;
  const showChoice2Button = row.secondaryClassId != null && !isOnChoice2;

  return (
    <div className={cn("flex flex-col gap-1.5", isPending && "opacity-60")}>
      <div className="flex items-center gap-1.5">
        <Select
          items={playerClasses.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onValueChange={(val) => val && handleClassChange(val)}
          disabled={isPending}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            {playerClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: UNSPECIFIED_ROLE_VALUE, label: "Autre" },
            ...(selectedClass?.roles.map((r) => ({ value: r.id, label: r.name })) ?? []),
          ]}
          value={roleId ?? UNSPECIFIED_ROLE_VALUE}
          onValueChange={(val) => val && handleRoleChange(val)}
          disabled={isPending || !selectedClass}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Métier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSPECIFIED_ROLE_VALUE}>Autre</SelectItem>
            {selectedClass?.roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
