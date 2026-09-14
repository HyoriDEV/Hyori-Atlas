"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DotsThreeVertical, PencilSimple, Trash, UserPlus, Users } from "@phosphor-icons/react";

import {
  computeGroupStats,
  rpGroupStatusLabels,
  rpGroupStatusVariants,
  type RpGroupWithMembers,
} from "@/lib/rp-groups";
import { deleteRpGroupAction } from "@/lib/actions/rp-group-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RpGroupMemberRow } from "./rp-group-member-row";
import { EditRpGroupDialog } from "./edit-rp-group-dialog";
import { AddGroupMemberDialog } from "./add-group-member-dialog";
import type { PlayerOption } from "@/components/player-select";

interface RpGroupCardProps {
  group: RpGroupWithMembers;
  availablePlayers: PlayerOption[];
  canManageGroups?: boolean;
}

export function RpGroupCard({ group, availablePlayers, canManageGroups = true }: RpGroupCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const stats = computeGroupStats(group.members);

  function handleDeleteGroup() {
    startDeleteTransition(async () => {
      const res = await deleteRpGroupAction(group.id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression du groupe.");
        return;
      }
      toast.success(`Le groupe « ${group.name} » a été supprimé.`);
      setIsDeleteDialogOpen(false);
    });
  }

  return (
    <>
      <Card className="border-border/80 flex flex-col gap-0 overflow-hidden transition-shadow hover:shadow-sm">
        {/* Card Header */}
        <CardHeader className="flex flex-col gap-3 pb-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {group.name}
              </span>
              <Badge variant={rpGroupStatusVariants[stats.status]}>
                {rpGroupStatusLabels[stats.status]}
              </Badge>
            </div>

            {canManageGroups && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {/* Progress overview */}
                {stats.totalMembers > 0 && (
                  <div className="mr-4 flex flex-col gap-1.5">
                    <div className="text-muted-foreground flex items-center justify-between gap-1.5 text-xs">
                      <span className="text-foreground font-semibold">
                        {stats.whitelistedCount + stats.validatedCount} / {stats.totalMembers}
                      </span>
                      <span>membres validés</span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${stats.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setIsAddMemberDialogOpen(true)}
                >
                  <UserPlus className="size-3.5" />
                  <span>Ajouter un membre</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="icon-sm" variant="ghost" className="size-8">
                        <DotsThreeVertical className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <PencilSimple className="mr-2 size-4" />
                      <span>Modifier</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash className="mr-2 size-4" />
                      <span>Dissoudre</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Card Body: Member Rows */}
        <CardContent className="flex flex-col gap-2 pt-0">
          {group.members.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
              <Users className="mb-2 size-8 stroke-[1.5] opacity-50" />
              <p className="text-xs font-medium">Ce groupe n&apos;a aucun membre pour le moment.</p>
              {canManageGroups && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={() => setIsAddMemberDialogOpen(true)}
                >
                  Ajouter un premier joueur
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {group.members.map((member) => (
                <RpGroupMemberRow
                  key={member.id}
                  member={member}
                  groupId={group.id}
                  canManageGroups={canManageGroups}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditRpGroupDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
        }}
      />

      <AddGroupMemberDialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        groupId={group.id}
        groupName={group.name}
        availablePlayers={availablePlayers}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dissoudre le groupe « {group.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera l&apos;ensemble des membres du groupe. Les comptes des joueurs
              et leurs fiches personnages ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Dissolution..." : "Dissoudre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
