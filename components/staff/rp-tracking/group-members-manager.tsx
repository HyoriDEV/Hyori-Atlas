"use client";

import { useState, useTransition } from "react";
import { UserPlus, Users, CircleNotch, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import type { RpTrackingGroupMemberInfo } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { PlayerSelect } from "@/components/player-select";
import { SkinHead } from "@/components/ui/skin-head";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  addRpTrackingGroupMemberAction,
  removeRpTrackingGroupMemberAction,
} from "@/lib/actions/group-rp-tracking-actions";

export function GroupMembersManager({
  groupId,
  members,
  availablePlayers,
}: {
  groupId: string;
  members: RpTrackingGroupMemberInfo[];
  availablePlayers: PlayerOption[];
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<RpTrackingGroupMemberInfo | null>(null);

  const [isAdding, startAddTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();

  const currentMemberIds = members.map((m) => m.userId);

  function handleAddMember() {
    if (!selectedPlayerId) return;

    startAddTransition(async () => {
      const res = await addRpTrackingGroupMemberAction(groupId, selectedPlayerId);
      if (!res.success) {
        toast.error(res.error || "Échec de l'ajout du membre.");
        return;
      }

      toast.success("Joueur ajouté au groupe de suivi.");
      setSelectedPlayerId(null);
      setAddDialogOpen(false);
    });
  }

  function handleRemoveMember() {
    if (!memberToRemove) return;

    startRemoveTransition(async () => {
      const res = await removeRpTrackingGroupMemberAction(groupId, memberToRemove.userId);
      if (!res.success) {
        toast.error(res.error || "Échec du retrait du membre.");
        return;
      }

      toast.success(`${memberToRemove.playerName} a été retiré(e) du groupe.`);
      setMemberToRemove(null);
    });
  }

  return (
    <div className="bg-muted/40 border-border rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
        <div className="flex items-center gap-2">
          <Users className="text-primary size-4" />
          <h3 className="font-heading text-sm font-semibold">
            Membres du groupe ({members.length})
          </h3>
        </div>

        {/* Dialog pour ajouter un membre */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <UserPlus className="size-3.5" />
                <span>Ajouter un joueur</span>
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un joueur au groupe</DialogTitle>
              <DialogDescription>
                Sélectionnez un joueur whitelisté pour l&apos;intégrer à ce groupe de suivi RP.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <PlayerSelect
                players={availablePlayers}
                excludedIds={currentMemberIds}
                value={selectedPlayerId}
                onChange={(id) => setSelectedPlayerId(id)}
                placeholder="Rechercher un joueur à ajouter..."
                triggerClassName="w-full"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isAdding}>
                Annuler
              </Button>
              <Button onClick={handleAddMember} disabled={!selectedPlayerId || isAdding}>
                {isAdding ? (
                  <>
                    <CircleNotch className="size-4 animate-spin" />
                    <span>Ajout...</span>
                  </>
                ) : (
                  <span>Ajouter au groupe</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des membres */}
      {members.length === 0 ? (
        <p className="text-muted-foreground py-2 text-xs italic">
          Aucun membre dans ce groupe pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {members.map((member) => (
            <div
              key={member.userId}
              className="bg-background border-border group flex items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-xs transition-colors"
            >
              <SkinHead
                username={member.minecraftUsername}
                avatarUrl={member.discordAvatarUrl}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-xs leading-tight font-medium">{member.playerName}</span>
                {member.character ? (
                  <span className="text-muted-foreground text-[10px] leading-tight">
                    {member.character.name}
                    {member.character.className && ` (${member.character.className})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[10px] leading-tight italic">
                    Sans fiche active
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 size-6 p-0 opacity-70 transition-opacity group-hover:opacity-100"
                onClick={() => setMemberToRemove(member)}
                title="Retirer du groupe"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation de retrait */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre du groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToRemove?.playerName}</strong> de ce
              groupe de suivi RP ? Ce joueur n&apos;aura plus accès aux échanges ni à la narration
              de ce groupe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isRemoving ? (
                <>
                  <CircleNotch className="size-4 animate-spin" />
                  <span>Retrait...</span>
                </>
              ) : (
                <span>Retirer</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
