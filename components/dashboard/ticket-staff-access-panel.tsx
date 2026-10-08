"use client";

import { useState, useTransition } from "react";
import { UserMinus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import {
  addTicketStaffAccess,
  removeTicketStaffAccess,
  setTicketTeamSummon,
} from "@/lib/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

export interface TicketTeamSummonState {
  team: Role;
  summonedAt: string | null;
  summonedByName: string | null;
}

export interface TicketStaffAccessMember {
  userId: string;
  role: Role;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
}

export function TicketStaffAccessPanel({
  ticketId,
  teams,
  staffMembers,
  availableStaff,
  className,
}: {
  ticketId: string;
  teams: TicketTeamSummonState[];
  staffMembers: TicketStaffAccessMember[];
  availableStaff: PlayerOption[];
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [teamToToggle, setTeamToToggle] = useState<TicketTeamSummonState | null>(null);
  const [loadingStaffId, setLoadingStaffId] = useState<string | null>(null);

  const summonedCount = teams.filter((t) => t.summonedAt).length;
  const isRevoking = Boolean(teamToToggle?.summonedAt);
  const teamLabel = teamToToggle ? staffRoleLabels[teamToToggle.team] : "";

  function handleConfirmTeam() {
    if (!teamToToggle) return;
    const { team } = teamToToggle;
    const summoned = !teamToToggle.summonedAt;

    startTransition(async () => {
      try {
        const result = await setTicketTeamSummon(ticketId, team, summoned);
        if (!result.success) {
          toast.error(result.error ?? "Une erreur est survenue.");
          return;
        }
        if (!summoned) {
          toast.success(`${staffRoleLabels[team]} : accès au ticket retiré.`);
        } else if (result.discord === "failed") {
          toast.warning(
            `${staffRoleLabels[team]} convoquée, mais la notification Discord n'a pas pu être envoyée. Vérifie le salon configuré pour cette équipe.`
          );
        } else if (result.discord === "disabled") {
          toast.success(
            `${staffRoleLabels[team]} convoquée (notification Discord désactivée pour cette équipe).`
          );
        } else {
          toast.success(`${staffRoleLabels[team]} convoquée et notifiée sur Discord.`);
        }
        setTeamToToggle(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  async function handleToggleStaff(staff: PlayerOption, isSelected: boolean) {
    setLoadingStaffId(staff.id);
    try {
      const result = isSelected
        ? await addTicketStaffAccess(ticketId, staff.id)
        : await removeTicketStaffAccess(ticketId, staff.id);
      if (!result.success) {
        toast.error(result.error ?? "Une erreur est survenue.");
        return;
      }
      toast.success(isSelected ? "Staff ajouté au ticket." : "Staff retiré du ticket.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoadingStaffId(null);
    }
  }

  return (
    <div
      className={cn(
        "bg-card text-card-foreground flex shrink-0 flex-col gap-3 rounded-xl border p-4 shadow-xs",
        className
      )}
    >
      <div className="border-border/50 flex flex-col gap-0.5 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-semibold">Accès staff</h3>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {summonedCount + staffMembers.length}
          </span>
        </div>
        <p className="text-muted-foreground text-[11px] leading-snug">
          Visible uniquement par les administrateurs et helpers.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Équipes convoquées</span>
        {teams.map((teamState) => {
          const isSummoned = Boolean(teamState.summonedAt);
          return (
            <div
              key={teamState.team}
              className="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{staffRoleLabels[teamState.team]}</span>
                <span className="text-muted-foreground truncate text-[11px]">
                  {isSummoned
                    ? `${formatDate(teamState.summonedAt, { style: "prefix-short" })}${
                        teamState.summonedByName ? ` par ${teamState.summonedByName}` : ""
                      }`
                    : "Non convoquée"}
                </span>
              </div>
              <Switch
                checked={isSummoned}
                disabled={isPending}
                onCheckedChange={() => setTeamToToggle(teamState)}
                aria-label={`${isSummoned ? "Retirer" : "Convoquer"} ${staffRoleLabels[teamState.team]}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">
            Staff ajoutés individuellement
          </span>
          <PlayerSelect
            multiple
            players={availableStaff}
            value={staffMembers.map((m) => m.userId)}
            onTogglePlayer={handleToggleStaff}
            showClearAll={false}
            searchPlaceholder="Chercher un staff..."
            placeholder="Ajouter un staff..."
            emptyText="Aucun staff disponible."
            align="end"
            renderTrigger={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Ajouter un staff au ticket"
                disabled={loadingStaffId !== null}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
        {staffMembers.length === 0 ? (
          <p className="text-muted-foreground py-1 text-xs">Aucun staff ajouté.</p>
        ) : (
          staffMembers.map((member) => {
            const name = member.minecraftUsername ?? member.discordDisplayName;
            return (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-2 rounded-lg border p-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {member.minecraftUsername ? (
                    <SkinHead size="sm" username={member.minecraftUsername} />
                  ) : (
                    <Avatar size="sm">
                      <AvatarImage src={member.discordAvatarUrl ?? undefined} alt={name} />
                      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {staffRoleLabels[member.role]}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 shrink-0"
                  onClick={() => handleToggleStaff({ id: member.userId }, false)}
                  disabled={loadingStaffId === member.userId}
                  title="Retirer du ticket"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog
        open={teamToToggle !== null}
        onOpenChange={(open) => !open && !isPending && setTeamToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRevoking ? `Retirer l'accès : ${teamLabel}` : `Convoquer : ${teamLabel}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRevoking
                ? "Les membres de cette équipe ne verront plus ce ticket, sauf ceux ajoutés individuellement."
                : "Ce ticket apparaîtra dans la liste des membres de cette équipe, et une notification sera envoyée sur son salon Discord. Rien n'indique à l'équipe ni au joueur qu'il s'agit d'une convocation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant={isRevoking ? "destructive" : "default"}
              onClick={handleConfirmTeam}
              disabled={isPending}
            >
              {isRevoking ? "Retirer l'accès" : "Convoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
