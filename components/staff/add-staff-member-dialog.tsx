"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "@phosphor-icons/react";

import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import { updateUserRoleAction } from "@/lib/actions/staff-team-actions";
import { PlayerSelect, type PlayerOption, getPlayerDisplayName } from "@/components/player-select";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffRoleBadge } from "@/components/staff/staff-role-badge";

const staffRoleOptions = [
  {
    value: Role.COMMUNICATION,
    label: staffRoleLabels[Role.COMMUNICATION],
    description: "Gestion des tickets joueurs et consultation de l'Atlas.",
  },
  {
    value: Role.CONFLICT_MANAGEMENT,
    label: staffRoleLabels[Role.CONFLICT_MANAGEMENT],
    description: "Gestion des litiges, conciliation, rapports GC et tickets.",
  },
  {
    value: Role.RP_TRACKING,
    label: staffRoleLabels[Role.RP_TRACKING],
    description: "Évaluation des fiches personnages, lore et salons de suivi RP.",
  },
  {
    value: Role.DEVELOPER,
    label: staffRoleLabels[Role.DEVELOPER],
    description: "Publication des changelogs et actualités techniques.",
  },
  {
    value: Role.ADMIN,
    label: staffRoleLabels[Role.ADMIN],
    description: "Accès complet aux modules d'administration et paramètres.",
  },
];

interface AddStaffMemberDialogProps {
  availablePlayers: PlayerOption[];
}

export function AddStaffMemberDialog({ availablePlayers }: AddStaffMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.COMMUNICATION);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    setSelectedPlayerId(null);
    setSelectedPlayer(null);
    setSelectedRole(Role.COMMUNICATION);
  }

  function handleAddMember() {
    if (!selectedPlayerId || !selectedPlayer) {
      toast.error("Veuillez sélectionner un joueur.");
      return;
    }

    startTransition(async () => {
      try {
        await updateUserRoleAction(selectedPlayerId, selectedRole);
        const name = getPlayerDisplayName(selectedPlayer);
        toast.success(
          `${name} a été ajouté à l'équipe staff avec le rôle ${staffRoleLabels[selectedRole]}.`
        );
        setIsOpen(false);
        handleReset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout du membre.");
      }
    });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) handleReset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="h-9 gap-1.5">
            <UserPlus className="size-4" />
            Ajouter un membre
          </Button>
        }
      />
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre au staff</DialogTitle>
          <DialogDescription>
            Recherchez un joueur inscrit sur la plateforme et choisissez le rôle à lui assigner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Sélection du joueur */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">
              Joueur à intégrer <span className="text-destructive">*</span>
            </label>
            <PlayerSelect
              multiple={false}
              players={availablePlayers}
              value={selectedPlayerId}
              onValueChange={(id, player) => {
                setSelectedPlayerId(id);
                setSelectedPlayer(player);
              }}
              placeholder="Rechercher un joueur..."
              searchPlaceholder="Rechercher par pseudo Minecraft ou Discord..."
              triggerClassName="w-full justify-between"
              align="start"
            />
          </div>

          {/* Sélection du rôle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">
              Rôle staff attribué <span className="text-destructive">*</span>
            </label>
            <Select
              items={staffRoleOptions}
              value={selectedRole}
              onValueChange={(val) => val && setSelectedRole(val as Role)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {staffRoleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col py-0.5 text-left">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-muted-foreground text-xs leading-tight">
                        {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Récapitulatif si un joueur est sélectionné */}
          {selectedPlayer && (
            <div className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-muted-foreground text-xs font-medium">
                Aperçu de l&apos;intégration :
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">
                  {getPlayerDisplayName(selectedPlayer)}
                </span>
                <StaffRoleBadge role={selectedRole} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button type="button" onClick={handleAddMember} disabled={!selectedPlayerId || isPending}>
            {isPending ? "Ajout en cours..." : "Confirmer l'ajout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
