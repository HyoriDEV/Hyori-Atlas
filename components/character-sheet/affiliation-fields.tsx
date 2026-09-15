"use client";

import { useMemo } from "react";
import { ChatCircleDots } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { CharacterSheetCommentTarget } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { commentTargetElementId } from "@/components/character-sheet/use-comment-target-scroll";
import { PlayerClassRatioCard } from "@/components/character-sheet/player-class-ratio-card";
import {
  getRoleStatusMeta,
  type PlayerClassWithStats,
} from "@/lib/role-balance";
import { OTHER_ROLE_ID } from "@/lib/character-sheet";

export interface AffiliationChoiceValues {
  primaryClassId: string | null;
  primaryRoleId: string | null;
  secondaryClassId: string | null;
  secondaryRoleId: string | null;
}

export interface AffiliationCardProps {
  playerClasses: PlayerClassWithStats[];
  values: AffiliationChoiceValues;
  interactive?: boolean;
  onChange?: (values: AffiliationChoiceValues) => void;
  commentedTargets?: CharacterSheetCommentTarget[];
  activeTarget?: CharacterSheetCommentTarget | null;
  onTargetClick?: (target: CharacterSheetCommentTarget) => void;
}

export function AffiliationCard({
  playerClasses,
  values,
  interactive = false,
  onChange,
  commentedTargets = [],
  activeTarget = null,
  onTargetClick,
}: AffiliationCardProps) {
  const isClickable = !interactive && !!onTargetClick;
  const isActive = activeTarget === CharacterSheetCommentTarget.chosenClasses;
  const hasComment = commentedTargets.includes(CharacterSheetCommentTarget.chosenClasses);

  const selectedPrimaryClass = useMemo(
    () => playerClasses.find((c) => c.id === values.primaryClassId) ?? null,
    [playerClasses, values.primaryClassId]
  );

  const selectedPrimaryRole = useMemo(
    () => selectedPrimaryClass?.roles.find((r) => r.id === values.primaryRoleId) ?? null,
    [selectedPrimaryClass, values.primaryRoleId]
  );

  const selectedSecondaryClass = useMemo(
    () => playerClasses.find((c) => c.id === values.secondaryClassId) ?? null,
    [playerClasses, values.secondaryClassId]
  );

  const selectedSecondaryRole = useMemo(
    () => selectedSecondaryClass?.roles.find((r) => r.id === values.secondaryRoleId) ?? null,
    [selectedSecondaryClass, values.secondaryRoleId]
  );

  function handlePrimaryClassChange(classId: string) {
    if (!onChange) return;
    const newClassId = classId || null;
    // Si la nouvelle classe est identique au 2e choix, réinitialiser le 2e choix
    const resetSecondary = newClassId && newClassId === values.secondaryClassId;

    onChange({
      primaryClassId: newClassId,
      primaryRoleId: null,
      secondaryClassId: resetSecondary ? null : values.secondaryClassId,
      secondaryRoleId: resetSecondary ? null : values.secondaryRoleId,
    });
  }

  function handlePrimaryRoleChange(roleId: string) {
    if (!onChange) return;
    onChange({
      ...values,
      primaryRoleId: roleId || null,
    });
  }

  function handleSecondaryClassChange(classId: string) {
    if (!onChange) return;
    onChange({
      ...values,
      secondaryClassId: classId || null,
      secondaryRoleId: null,
    });
  }

  function handleSecondaryRoleChange(roleId: string) {
    if (!onChange) return;
    onChange({
      ...values,
      secondaryRoleId: roleId || null,
    });
  }

  return (
    <Card
      id={commentTargetElementId(CharacterSheetCommentTarget.chosenClasses)}
      onClick={isClickable ? () => onTargetClick(CharacterSheetCommentTarget.chosenClasses) : undefined}
      className={cn(
        "flex flex-col gap-0 transition-colors",
        isClickable && "hover:border-primary/50 cursor-pointer",
        isActive && "border-primary bg-primary/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <CardTitle>Affiliation</CardTitle>
          {hasComment && <ChatCircleDots className="text-primary size-4 shrink-0" />}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Indique deux classes par ordre de préférence ainsi que le rôle souhaité au sein de
          chacune. Les rôles indiquent leur état d&apos;équilibre selon les choix des joueurs.
        </p>

        {/* --- PREMIER CHOIX --- */}
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="primary-class" className="text-sm font-semibold">
            Premier choix
          </Label>

          {interactive ? (
            <Select
              items={playerClasses.map((c) => ({ value: c.id, label: c.name }))}
              value={values.primaryClassId ?? ""}
              onValueChange={(val) => handlePrimaryClassChange(val ?? "")}
            >
              <SelectTrigger id="primary-class" className="w-full">
                <SelectValue placeholder="Sélectionner une classe..." />
              </SelectTrigger>
              <SelectContent>
                {playerClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              {selectedPrimaryClass ? selectedPrimaryClass.name : "—"}
            </p>
          )}

          {/* Rôle du Premier Choix */}
          {selectedPrimaryClass && (
            <div className="mt-1 flex flex-col gap-2.5">
              <Label htmlFor="primary-role" className="text-muted-foreground text-xs font-medium">
                Rôle souhaité (1er choix)
              </Label>

              {interactive ? (
                <Select
                  items={selectedPrimaryClass.roles.map((r) => ({ value: r.id, label: r.name }))}
                  value={values.primaryRoleId ?? ""}
                  onValueChange={(val) => handlePrimaryRoleChange(val ?? "")}
                >
                  <SelectTrigger id="primary-role" className="w-full">
                    <SelectValue placeholder="Sélectionner un rôle...">
                      {values.primaryRoleId === OTHER_ROLE_ID ? (
                        <span>Autre (préciser dans le métier)</span>
                      ) : selectedPrimaryRole ? (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate">{selectedPrimaryRole.name}</span>
                          {(() => {
                            const meta = getRoleStatusMeta(selectedPrimaryRole.status);
                            return (
                              <Badge
                                variant={meta.badgeVariant}
                                className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                              >
                                {meta.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPrimaryClass.roles.map((role) => {
                      const meta = getRoleStatusMeta(role.status);
                      return (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex w-full items-center justify-between gap-3 pr-4">
                            <span>{role.name}</span>
                            <Badge
                              variant={meta.badgeVariant}
                              className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                            >
                              {meta.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                    <SelectItem key={OTHER_ROLE_ID} value={OTHER_ROLE_ID}>
                      Autre (préciser dans le métier)
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : values.primaryRoleId === OTHER_ROLE_ID ? (
                <p className="text-sm">Autre</p>
              ) : selectedPrimaryRole ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{selectedPrimaryRole.name}</span>
                  {(() => {
                    const meta = getRoleStatusMeta(selectedPrimaryRole.status);
                    return (
                      <Badge
                        variant={meta.badgeVariant}
                        className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                      >
                        {meta.label}
                      </Badge>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">Aucun rôle sélectionné</p>
              )}

              {/* Sous-carte d'équilibre du ratio pour le premier choix */}
              <PlayerClassRatioCard playerClass={selectedPrimaryClass} />
            </div>
          )}
        </div>

        <div className="border-border/60 border-t pt-1" />

        {/* --- DEUXIÈME CHOIX --- */}
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="secondary-class" className="text-sm font-semibold">
            Deuxième choix
          </Label>

          {interactive ? (
            <Select
              items={playerClasses
                .filter((c) => c.id !== values.primaryClassId)
                .map((c) => ({ value: c.id, label: c.name }))}
              value={values.secondaryClassId ?? ""}
              onValueChange={(val) => handleSecondaryClassChange(val ?? "")}
            >
              <SelectTrigger id="secondary-class" className="w-full">
                <SelectValue placeholder="Sélectionner une seconde classe..." />
              </SelectTrigger>
              <SelectContent>
                {playerClasses
                  .filter((c) => c.id !== values.primaryClassId)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              {selectedSecondaryClass ? selectedSecondaryClass.name : "—"}
            </p>
          )}

          {/* Rôle du Deuxième Choix */}
          {selectedSecondaryClass && (
            <div className="mt-1 flex flex-col gap-2.5">
              <Label htmlFor="secondary-role" className="text-muted-foreground text-xs font-medium">
                Rôle souhaité (2e choix)
              </Label>

              {interactive ? (
                <Select
                  items={selectedSecondaryClass.roles.map((r) => ({ value: r.id, label: r.name }))}
                  value={values.secondaryRoleId ?? ""}
                  onValueChange={(val) => handleSecondaryRoleChange(val ?? "")}
                >
                  <SelectTrigger id="secondary-role" className="w-full">
                    <SelectValue placeholder="Sélectionner un rôle...">
                      {values.secondaryRoleId === OTHER_ROLE_ID ? (
                        <span>Autre (préciser dans le métier)</span>
                      ) : selectedSecondaryRole ? (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate">{selectedSecondaryRole.name}</span>
                          {(() => {
                            const meta = getRoleStatusMeta(selectedSecondaryRole.status);
                            return (
                              <Badge
                                variant={meta.badgeVariant}
                                className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                              >
                                {meta.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSecondaryClass.roles.map((role) => {
                      const meta = getRoleStatusMeta(role.status);
                      return (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex w-full items-center justify-between gap-3 pr-4">
                            <span>{role.name}</span>
                            <Badge
                              variant={meta.badgeVariant}
                              className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                            >
                              {meta.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                    <SelectItem key={OTHER_ROLE_ID} value={OTHER_ROLE_ID}>
                      Autre (préciser dans le métier)
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : values.secondaryRoleId === OTHER_ROLE_ID ? (
                <p className="text-sm">Autre</p>
              ) : selectedSecondaryRole ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{selectedSecondaryRole.name}</span>
                  {(() => {
                    const meta = getRoleStatusMeta(selectedSecondaryRole.status);
                    return (
                      <Badge
                        variant={meta.badgeVariant}
                        className={cn("h-4.5 px-1.5 py-0 text-[10px]", meta.className)}
                      >
                        {meta.label}
                      </Badge>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">Aucun rôle sélectionné</p>
              )}

              {/* Sous-carte d'équilibre du ratio pour le deuxième choix */}
              <PlayerClassRatioCard playerClass={selectedSecondaryClass} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
