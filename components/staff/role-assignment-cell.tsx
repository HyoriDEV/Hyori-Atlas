"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import { updateUserRoleAction } from "@/lib/actions/staff-team-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StaffRoleBadge } from "@/components/staff/staff-role-badge";

const roleDescriptions: Record<Role, string> = {
  [Role.ADMIN]: "Accès complet à tous les modules d'administration, gestion des membres et paramètres globaux.",
  [Role.COMMUNICATION]: "Gestion des tickets joueurs et consultation de l'Atlas des joueurs.",
  [Role.CONFLICT_MANAGEMENT]: "Gestion des litiges, conciliation, rapports GC et tickets joueurs.",
  [Role.RP_TRACKING]: "Évaluation des fiches personnages, validation du lore et salons de suivi RP.",
  [Role.DEVELOPER]: "Publication des changelogs et actualités techniques du serveur.",
  [Role.PLAYER]: "Rôle standard réservé aux joueurs (aucun accès à l'espace staff).",
};

const roleOptions = Object.values(Role)
  .filter((role) => role !== Role.PLAYER)
  .map((role) => ({
    value: role,
    label: staffRoleLabels[role],
    description: roleDescriptions[role],
  }));

interface RoleAssignmentCellProps {
  userId: string;
  userName: string;
  currentRole: Role;
  isCurrentAdmin: boolean;
}

export function RoleAssignmentCell({
  userId,
  userName,
  currentRole,
  isCurrentAdmin,
}: RoleAssignmentCellProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();

  // Synchronise if currentRole changes from outside
  if (selectedRole !== currentRole && pendingRole === null && !isPending) {
    setSelectedRole(currentRole);
  }

  function handleSelectRole(newRoleValue: string | null) {
    if (!newRoleValue) return;
    const newRole = newRoleValue as Role;
    if (newRole === currentRole) {
      setSelectedRole(currentRole);
      return;
    }

    if (isCurrentAdmin && newRole !== Role.ADMIN) {
      toast.error("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
      setSelectedRole(currentRole);
      return;
    }

    setPendingRole(newRole);
  }

  function handleConfirmChange() {
    if (!pendingRole) return;
    const targetRole = pendingRole;

    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, targetRole);
        setSelectedRole(targetRole);
        toast.success(
          `Le rôle de ${userName} a été mis à jour : ${staffRoleLabels[targetRole]}.`
        );
      } catch (error) {
        setSelectedRole(currentRole);
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue lors de la mise à jour.");
      } finally {
        setPendingRole(null);
      }
    });
  }

  function handleCancelChange() {
    setPendingRole(null);
    setSelectedRole(currentRole);
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        items={roleOptions}
        value={selectedRole}
        onValueChange={handleSelectRole}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="min-w-[170px]">
          <SelectValue placeholder="Choisir un rôle" />
        </SelectTrigger>
        <SelectContent align="end">
          {roleOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col py-0.5">
                <span className="font-medium">{opt.label}</span>
                <span className="text-muted-foreground text-xs leading-tight">
                  {opt.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            handleCancelChange();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le rôle de l&apos;utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir modifier le rôle de{" "}
              <strong className="text-foreground">{userName}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3 py-1 text-sm">
            <div className="bg-muted/50 rounded-md border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rôle actuel :</span>
                <StaffRoleBadge role={currentRole} />
              </div>
              <div className="my-2 border-t border-border/50" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Nouveau rôle :</span>
                {pendingRole && <StaffRoleBadge role={pendingRole} />}
              </div>
            </div>

            {pendingRole && (
              <p className="text-muted-foreground text-xs">
                {roleDescriptions[pendingRole]}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange} disabled={isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange} disabled={isPending}>
              {isPending ? "Modification en cours..." : "Confirmer l'assignation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
