"use client";

import { useState } from "react";
import { UserMinus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { addTicketMember, removeTicketMember } from "@/lib/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { PlayerOption, PlayerSelect } from "@/components/player-select";
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

type MemberProps = {
  userId: string;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  isCreator?: boolean;
};

export function TicketMembersManager({
  ticketId,
  members,
  availablePlayers = [],
  readOnly = false,
}: {
  ticketId?: string;
  members: MemberProps[];
  availablePlayers?: PlayerOption[];
  readOnly?: boolean;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<MemberProps | null>(null);

  const handleAdd = async (playerId: string) => {
    if (!ticketId || readOnly) return;
    setLoadingId(playerId);
    try {
      await addTicketMember(ticketId, playerId);
      toast.success("Membre ajouté au ticket.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ajouter le membre.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (playerId: string) => {
    if (!ticketId || readOnly) return;
    setLoadingId(playerId);
    try {
      await removeTicketMember(ticketId, playerId);
      toast.success("Membre retiré du ticket.");
      setMemberToRemove(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de retirer le membre.");
    } finally {
      setLoadingId(null);
    }
  };

  const memberIds = members.map((m) => m.userId);

  const handleToggle = async (player: PlayerOption, isSelected: boolean) => {
    if (isSelected) {
      await handleAdd(player.id);
    } else {
      const existing = members.find((m) => m.userId === player.id);
      setMemberToRemove(
        existing ?? {
          userId: player.id,
          minecraftUsername: player.minecraftUsername ?? null,
          discordDisplayName: player.discordDisplayName ?? player.id,
          discordAvatarUrl: player.discordAvatarUrl ?? null,
        }
      );
    }
  };

  return (
    <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Membres du ticket</h3>
        {!readOnly && (
          <PlayerSelect
            multiple
            players={availablePlayers}
            value={memberIds}
            onTogglePlayer={handleToggle}
            showClearAll={false}
            searchPlaceholder="Chercher un joueur..."
            placeholder="Gérer les membres..."
            align="end"
            renderTrigger={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Gérer les membres"
                disabled={loadingId !== null}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            }
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {members.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Aucun membre dans ce ticket.
          </p>
        ) : (
          members.map((member) => {
            const name = member.minecraftUsername ?? member.discordDisplayName;
            return (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-3">
                  {member.minecraftUsername ? (
                    <SkinHead size="sm" username={member.minecraftUsername} />
                  ) : (
                    <Avatar size="sm">
                      <AvatarImage src={member.discordAvatarUrl ?? undefined} alt={name} />
                      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                    onClick={() => setMemberToRemove(member)}
                    disabled={loadingId === member.userId}
                    title="Retirer du ticket"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le membre du ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Retirer{" "}
              <span className="text-foreground font-medium">
                {memberToRemove?.minecraftUsername ?? memberToRemove?.discordDisplayName}
              </span>{" "}
              de ce ticket ? Ce joueur n&apos;aura plus accès à la conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loadingId !== null}
              onClick={() => {
                if (memberToRemove) {
                  handleRemove(memberToRemove.userId);
                }
              }}
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
