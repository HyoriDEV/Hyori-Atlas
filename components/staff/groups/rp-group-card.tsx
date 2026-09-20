"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DotsThreeVertical, PencilSimple, Trash, UserPlus, Users } from "@phosphor-icons/react";

import { computeGroupStats, type RpGroupWithMembers } from "@/lib/rp-groups";
import { deleteRpGroupAction } from "@/lib/actions/rp-group-actions";
import { Button } from "@/components/ui/button";
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
      <div className="border-border/70 bg-card overflow-hidden rounded-lg border">
        {/* Header */}
        <div className="border-border/50 bg-muted/20 flex items-center gap-2 border-b px-3.5 py-2.5">
          <span className="text-foreground flex-1 truncate text-sm font-semibold">
            {group.name}
          </span>

          {stats.totalMembers > 0 && (
            <div className="text-foreground flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums">
              {stats.whitelistedCount + stats.validatedCount} / {stats.totalMembers}
              <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {canManageGroups && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground size-7"
                onClick={() => setIsAddMemberDialogOpen(true)}
                title="Ajouter un membre"
              >
                <UserPlus className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground size-7"
                    >
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

        {/* Members list */}
        <div className="px-2 py-1.5">
          {group.members.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs">
              <Users className="size-4 shrink-0 opacity-50" />
              <span className="italic">Aucun membre</span>
              {canManageGroups && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberDialogOpen(true)}
                  className="text-primary ml-1 text-xs font-medium hover:underline"
                >
                  Ajouter un joueur
                </button>
              )}
            </div>
          ) : (
            <div className="divide-border/30 flex flex-col divide-y">
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
        </div>
      </div>

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
