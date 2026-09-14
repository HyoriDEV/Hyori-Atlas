"use client";

import { useState, useTransition } from "react";
import { DotsThreeVertical, PencilSimple, Plus, Trash, Minus, Scales } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  EditClassDialog,
  DeleteClassDialog,
  CreateRoleDialog,
  EditRoleDialog,
  DeleteRoleDialog,
} from "@/components/staff/distribution/class-dialogs";
import { adjustPlayerClassRoleRatioAction } from "@/lib/actions/distribution-actions";

export interface SerializedClassRole {
  id: string;
  playerClassId: string;
  name: string;
  ratio: number;
  order: number;
}

export interface SerializedPlayerClass {
  id: string;
  name: string;
  order: number;
  roles: SerializedClassRole[];
}

const PALETTE = [
  { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30", fill: "#f59e0b" },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    fill: "#10b981",
  },
  { bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500/30", fill: "#0ea5e9" },
  { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30", fill: "#8b5cf6" },
  { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30", fill: "#f43f5e" },
  { bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/30", fill: "#6366f1" },
  { bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-500/30", fill: "#14b8a6" },
  { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", fill: "#f97316" },
  { bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500/30", fill: "#06b6d4" },
  {
    bg: "bg-fuchsia-500",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500/30",
    fill: "#d946ef",
  },
];

export function PlayerClassCard({ playerClass }: { playerClass: SerializedPlayerClass }) {
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [deleteClassOpen, setDeleteClassOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SerializedClassRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<SerializedClassRole | null>(null);

  const [isAdjusting, startAdjustTransition] = useTransition();

  const totalRatio = playerClass.roles.reduce((sum, r) => sum + r.ratio, 0);

  function handleQuickAdjust(roleId: string, delta: number) {
    startAdjustTransition(async () => {
      const res = await adjustPlayerClassRoleRatioAction(roleId, delta);
      if (!res.success) {
        toast.error(res.error || "Impossible d'ajuster le ratio.");
      }
    });
  }

  return (
    <>
      <Card className="flex flex-col justify-between gap-5 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-foreground text-lg font-bold tracking-tight">
                  {playerClass.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setCreateRoleOpen(true)}
              >
                <Plus className="size-3.5" />
                <span>Ajouter un rôle</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Actions de la classe">
                      <DotsThreeVertical className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditClassOpen(true)}>
                    <PencilSimple className="size-4" />
                    <span>Renommer</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteClassOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="size-4" />
                    <span>Supprimer</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {playerClass.roles.length > 0 && totalRatio > 0 ? (
            <div className="border-border/60 bg-muted/20 flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Scales className="size-3.5" />
                  <span>Équilibre des rôles</span>
                </span>
                <span className="text-muted-foreground">
                  {playerClass.roles.map((r, i) => `${r.ratio} ${r.name}`).join(" · ")}
                </span>
              </div>

              <div className="bg-muted/60 flex h-3 w-full overflow-hidden rounded-full p-0.5">
                {playerClass.roles.map((role, idx) => {
                  const percentage = ((role.ratio / totalRatio) * 100).toFixed(1);
                  const color = PALETTE[idx % PALETTE.length];
                  return (
                    <Tooltip key={role.id}>
                      <TooltipTrigger
                        render={
                          <div
                            style={{ width: `${(role.ratio / totalRatio) * 100}%` }}
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
                            Ratio {role.ratio} ({percentage}%)
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                {playerClass.roles.map((role, idx) => {
                  const percentage = ((role.ratio / totalRatio) * 100).toFixed(0);
                  const color = PALETTE[idx % PALETTE.length];
                  return (
                    <div key={role.id} className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${color.bg}`} />
                      <span className="text-foreground/90">{role.name}</span>
                      <span className="text-muted-foreground font-mono">({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Rôles & Ratios
            </span>

            {playerClass.roles.length === 0 ? (
              <div className="border-border/80 flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground text-sm">Aucun rôle configuré.</p>
              </div>
            ) : (
              <div className="border-border/60 overflow-hidden rounded-lg border">
                <div className="divide-border/60 divide-y">
                  {playerClass.roles.map((role, idx) => {
                    const percentage =
                      totalRatio > 0 ? ((role.ratio / totalRatio) * 100).toFixed(1) : "0";
                    const color = PALETTE[idx % PALETTE.length];

                    return (
                      <div
                        key={role.id}
                        className="hover:bg-muted/30 flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`size-2.5 shrink-0 rounded-full ${color.bg}`}
                            aria-hidden
                          />
                          <span className="text-foreground truncate text-sm font-medium">
                            {role.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="border-border/70 bg-background flex items-center rounded-md border shadow-2xs">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground h-7 w-7 rounded-none rounded-l-md"
                                onClick={() => handleQuickAdjust(role.id, -1)}
                                disabled={isAdjusting || role.ratio <= 1}
                                aria-label="Diminuer le ratio"
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="min-w-8 text-center font-mono text-xs font-semibold">
                                {role.ratio}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground h-7 w-7 rounded-none rounded-r-md"
                                onClick={() => handleQuickAdjust(role.id, 1)}
                                disabled={isAdjusting}
                                aria-label="Augmenter le ratio"
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground h-7 w-7"
                              onClick={() => setEditingRole(role)}
                              aria-label="Modifier le rôle"
                            >
                              <PencilSimple className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive h-7 w-7"
                              onClick={() => setDeletingRole(role)}
                              aria-label="Supprimer le rôle"
                            >
                              <Trash className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <EditClassDialog
        playerClass={playerClass}
        open={editClassOpen}
        onOpenChange={setEditClassOpen}
      />
      <DeleteClassDialog
        playerClass={playerClass}
        open={deleteClassOpen}
        onOpenChange={setDeleteClassOpen}
      />
      <CreateRoleDialog
        classId={playerClass.id}
        className={playerClass.name}
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
      />
      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          open={Boolean(editingRole)}
          onOpenChange={(open) => !open && setEditingRole(null)}
        />
      )}
      {deletingRole && (
        <DeleteRoleDialog
          role={deletingRole}
          open={Boolean(deletingRole)}
          onOpenChange={(open) => !open && setDeletingRole(null)}
        />
      )}
    </>
  );
}
