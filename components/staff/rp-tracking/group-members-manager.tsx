"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, UserMinus, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { RpTrackingGroupMemberInfo } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { PlayerSelect } from "@/components/player-select";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  availablePlayers = [],
  readOnly = false,
  className,
}: {
  groupId: string;
  members: RpTrackingGroupMemberInfo[];
  availablePlayers?: PlayerOption[];
  readOnly?: boolean;
  className?: string;
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<RpTrackingGroupMemberInfo | null>(null);

  const [isAdding, startAddTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();

  const currentMemberIds = members.map((m) => m.userId);

  function handleAddMember() {
    if (!selectedPlayerId || readOnly) return;

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
    if (!memberToRemove || readOnly) return;

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
    <div
      className={cn(
        "bg-card text-card-foreground flex h-full min-h-0 flex-col gap-3 rounded-xl border p-4 shadow-xs",
        className
      )}
    >
      <div className="border-border/50 flex shrink-0 items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-semibold">Membres</h3>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {members.length}
          </span>
        </div>

        {!readOnly && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ajouter un joueur"
            onClick={() => setAddDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {members.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Aucun membre dans ce groupe.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-2 rounded-lg border p-2"
            >
              {readOnly ? (
                <div className="flex min-w-0 items-center gap-3">
                  {member.minecraftUsername ? (
                    <SkinHead size="sm" username={member.minecraftUsername} />
                  ) : (
                    <Avatar size="sm">
                      <AvatarImage
                        src={member.discordAvatarUrl ?? undefined}
                        alt={member.playerName}
                      />
                      <AvatarFallback>{member.playerName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{member.playerName}</span>
                    {member.character && (
                      <span className="text-muted-foreground truncate text-xs">
                        {member.character.name}
                        {member.character.className && ` · ${member.character.className}`}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <Link
                  href={`/staff/atlas/${member.userId}`}
                  className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
                  title={`Voir la fiche Atlas de ${member.playerName}`}
                >
                  {member.minecraftUsername ? (
                    <SkinHead size="sm" username={member.minecraftUsername} />
                  ) : (
                    <Avatar size="sm">
                      <AvatarImage
                        src={member.discordAvatarUrl ?? undefined}
                        alt={member.playerName}
                      />
                      <AvatarFallback>{member.playerName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium hover:underline">
                      {member.playerName}
                    </span>
                    {member.character && (
                      <span className="text-muted-foreground truncate text-xs">
                        {member.character.name}
                        {member.character.className && ` · ${member.character.className}`}
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 shrink-0"
                  onClick={() => setMemberToRemove(member)}
                  disabled={isRemoving}
                  title="Retirer du groupe"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog d'ajout de joueur */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
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

      {/* Confirmation de retrait */}
      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre du groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToRemove?.playerName}</strong> de ce
              groupe de suivi RP ? Ce joueur n&apos;aura plus accès aux échanges de ce groupe.
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
