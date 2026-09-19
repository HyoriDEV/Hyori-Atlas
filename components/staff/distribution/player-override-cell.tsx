"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, PencilSimple } from "@phosphor-icons/react";

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
  isEditing,
  onStartEdit,
  onStopEdit,
  onOptimisticUpdate,
}: {
  row: PlayerAffiliationRow;
  playerClasses: SerializedPlayerClass[];
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onOptimisticUpdate?: (
    sheetId: string,
    classId: string,
    className: string,
    roleId: string | null,
    roleName: string
  ) => void;
}) {
  const [classId, setClassId] = useState(row.effectiveClassId);
  const [roleId, setRoleId] = useState<string | null>(row.effectiveRoleId);
  const [isPending, startTransition] = useTransition();

  const selectedClass = playerClasses.find((c) => c.id === classId) ?? null;

  function commit(nextClassId: string, nextRoleId: string | null) {
    setClassId(nextClassId);
    setRoleId(nextRoleId);

    const targetClass = playerClasses.find((c) => c.id === nextClassId);
    const targetRole = targetClass?.roles.find((r) => r.id === nextRoleId);
    const targetClassName = targetClass?.name ?? row.effectiveClassName;
    const targetRoleName = targetRole?.name ?? "Autre";

    if (onOptimisticUpdate) {
      onOptimisticUpdate(row.sheetId, nextClassId, targetClassName, nextRoleId, targetRoleName);
    }

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
        if (onOptimisticUpdate) {
          onOptimisticUpdate(
            row.sheetId,
            row.effectiveClassId,
            row.effectiveClassName,
            row.effectiveRoleId,
            row.effectiveRoleName
          );
        }
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

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        className="group hover:bg-muted/60 focus-visible:ring-ring/50 -mx-2 -my-1 inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors outline-none focus-visible:ring-2"
        title="Cliquer pour modifier le choix retenu"
      >
        <span className="text-foreground font-medium">
          {row.effectiveClassName} — {row.effectiveRoleName}
        </span>
        <PencilSimple className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-1.5", isPending && "opacity-70")}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onStopEdit();
        }
      }}
    >
      <Select
        items={playerClasses.map((c) => ({ value: c.id, label: c.name }))}
        value={classId}
        onValueChange={(val) => val && handleClassChange(val)}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="w-28 text-xs">
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
        <SelectTrigger size="sm" className="w-28 text-xs">
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

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onStopEdit}
        className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0 cursor-pointer"
        title="Terminer l'édition"
      >
        <Check className="size-3.5" weight="bold" />
      </Button>
    </div>
  );
}
