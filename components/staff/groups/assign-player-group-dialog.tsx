"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";

import { assignPlayerGroupAction, createRpGroupAction } from "@/lib/actions/rp-group-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignPlayerGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerPseudo: string;
  currentGroupId: string | null;
  availableGroups: Array<{
    id: string;
    name: string;
    memberCount?: number;
  }>;
}

export function AssignPlayerGroupDialog({
  open,
  onOpenChange,
  playerId,
  playerPseudo,
  currentGroupId,
  availableGroups,
}: AssignPlayerGroupDialogProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(currentGroupId ?? "none");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedGroupId(currentGroupId ?? "none");
      setIsCreatingNew(availableGroups.length === 0);
      setNewGroupName("");
    }
  }

  const selectedGroup = availableGroups.find((g) => g.id === selectedGroupId);
  const hasNoGroups = availableGroups.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      if (isCreatingNew) {
        const trimmed = newGroupName.trim();
        if (!trimmed) {
          toast.error("Le nom du nouveau groupe est obligatoire.");
          return;
        }

        const createRes = await createRpGroupAction({
          name: trimmed,
          memberIds: [playerId],
        });

        if (!createRes.success) {
          toast.error(createRes.error || "Erreur lors de la création du groupe.");
          return;
        }

        toast.success(`Le groupe « ${trimmed} » a été créé et assigné à ${playerPseudo}.`);
        setIsCreatingNew(false);
        setNewGroupName("");
        onOpenChange(false);
        return;
      }

      const targetGroupId = selectedGroupId === "none" ? null : selectedGroupId;
      const res = await assignPlayerGroupAction(playerId, targetGroupId);

      if (!res.success) {
        toast.error(res.error || "Erreur lors de l'assignation du groupe.");
        return;
      }

      if (targetGroupId) {
        const groupName = availableGroups.find((g) => g.id === targetGroupId)?.name ?? "groupe";
        toast.success(`${playerPseudo} a été assigné au groupe « ${groupName} ».`);
      } else {
        toast.success(`${playerPseudo} a été retiré de son groupe.`);
      }

      onOpenChange(false);
    });
  }

  const isSubmitDisabled =
    isPending ||
    (isCreatingNew && !newGroupName.trim()) ||
    (!isCreatingNew && hasNoGroups) ||
    (!isCreatingNew && !currentGroupId && selectedGroupId === "none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Assigner un groupe RP</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {!isCreatingNew ? (
              hasNoGroups ? (
                <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-muted-foreground text-xs">
                    Aucun groupe RP n&apos;existe pour le moment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setIsCreatingNew(true)}
                  >
                    <Plus className="size-3.5" />
                    Créer un premier groupe
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label>Groupe RP</Label>
                  <Select
                    value={selectedGroupId}
                    onValueChange={(val) => setSelectedGroupId(val ?? "none")}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un groupe...">
                        {selectedGroupId === "none" ? (
                          currentGroupId ? (
                            <span>Aucun groupe (retirer du groupe)</span>
                          ) : (
                            <span className="text-muted-foreground">Choisir un groupe...</span>
                          )
                        ) : (
                          <span>
                            {selectedGroup?.name}
                            {typeof selectedGroup?.memberCount === "number"
                              ? ` (${selectedGroup.memberCount} membre${selectedGroup.memberCount > 1 ? "s" : ""})`
                              : ""}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currentGroupId && (
                        <SelectItem value="none">Aucun groupe (retirer du groupe)</SelectItem>
                      )}
                      {availableGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                          {typeof g.memberCount === "number"
                            ? ` (${g.memberCount} membre${g.memberCount > 1 ? "s" : ""})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
                      onClick={() => setIsCreatingNew(true)}
                    >
                      <Plus className="size-3.5" />
                      Créer un nouveau groupe
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <Label htmlFor="create-new-group-name">Nom du nouveau groupe</Label>
                <Input
                  id="create-new-group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isPending}
                  autoFocus
                />
                {!hasNoGroups && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground self-start text-xs"
                    onClick={() => setIsCreatingNew(false)}
                  >
                    Sélectionner un groupe existant
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isPending
                ? "Enregistrement..."
                : isCreatingNew
                  ? "Créer et assigner"
                  : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
