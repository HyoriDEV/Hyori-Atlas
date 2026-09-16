"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createPlayerClassAction,
  updatePlayerClassAction,
  deletePlayerClassAction,
  createPlayerClassRoleAction,
  updatePlayerClassRoleAction,
  deletePlayerClassRoleAction,
} from "@/lib/actions/distribution-actions";

export function CreateClassDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const res = await createPlayerClassAction({ name });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la création de la classe.");
        return;
      }
      toast.success(`La classe "${name.trim()}" a été créée.`);
      setName("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Nouvelle classe</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="class-name">Nom de la classe</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
              required
            />
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Création..." : "Créer la classe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditClassDialog({
  playerClass,
  open,
  onOpenChange,
}: {
  playerClass: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(playerClass.name);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const res = await updatePlayerClassAction(playerClass.id, { name });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la modification de la classe.");
        return;
      }
      toast.success("Classe mise à jour.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Renommer la classe</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-class-name">Nom de la classe</Label>
            <Input
              id="edit-class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
              required
            />
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteClassDialog({
  playerClass,
  open,
  onOpenChange,
}: {
  playerClass: { id: string; name: string; _count?: { roles: number } };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePlayerClassAction(playerClass.id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression de la classe.");
        return;
      }
      toast.success(`La classe "${playerClass.name}" a été supprimée.`);
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la classe &quot;{playerClass.name}&quot; ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les rôles et ratios seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CreateRoleDialog({
  classId,
  className,
  open,
  onOpenChange,
}: {
  classId: string;
  className: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [ratio, setRatio] = useState("1");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRatio = parseInt(ratio, 10);
    if (isNaN(parsedRatio) || parsedRatio < 1) {
      toast.error("Le ratio doit être un entier supérieur ou égal à 1.");
      return;
    }

    startTransition(async () => {
      const res = await createPlayerClassRoleAction({
        playerClassId: classId,
        name,
        ratio: parsedRatio,
      });

      if (!res.success) {
        toast.error(res.error || "Erreur lors de l'ajout du rôle.");
        return;
      }
      toast.success(`Rôle "${name.trim()}" ajouté avec succès.`);
      setName("");
      setRatio("1");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Ajouter un rôle à &quot;{className}&quot;</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">Nom du rôle</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="role-ratio">Ratio / Poids d&apos;équilibre</Label>
              <span className="text-muted-foreground text-xs">Minimum : 1</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setRatio((prev) => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))
                }
                disabled={isPending || (parseInt(ratio, 10) || 1) <= 1}
              >
                -
              </Button>
              <Input
                id="role-ratio"
                type="number"
                min="1"
                step="1"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                disabled={isPending}
                className="text-center font-semibold"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRatio((prev) => String((parseInt(prev, 10) || 1) + 1))}
                disabled={isPending}
              >
                +
              </Button>
            </div>
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: { id: string; name: string; ratio: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(role.name);
  const [ratio, setRatio] = useState(String(role.ratio));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRatio = parseInt(ratio, 10);
    if (isNaN(parsedRatio) || parsedRatio < 1) {
      toast.error("Le ratio doit être supérieur ou égal à 1.");
      return;
    }

    startTransition(async () => {
      const res = await updatePlayerClassRoleAction(role.id, {
        name,
        ratio: parsedRatio,
      });

      if (!res.success) {
        toast.error(res.error || "Erreur lors de la modification du rôle.");
        return;
      }
      toast.success("Rôle mis à jour.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-role-name">Nom du rôle</Label>
            <Input
              id="edit-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-role-ratio">Ratio / Poids d&apos;équilibre</Label>
              <span className="text-muted-foreground text-xs">Minimum : 1</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setRatio((prev) => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))
                }
                disabled={isPending || (parseInt(ratio, 10) || 1) <= 1}
              >
                -
              </Button>
              <Input
                id="edit-role-ratio"
                type="number"
                min="1"
                step="1"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                disabled={isPending}
                className="text-center font-semibold"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRatio((prev) => String((parseInt(prev, 10) || 1) + 1))}
                disabled={isPending}
              >
                +
              </Button>
            </div>
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePlayerClassRoleAction(role.id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression du rôle.");
        return;
      }
      toast.success(`Le rôle "${role.name}" a été supprimé.`);
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le rôle &quot;{role.name}&quot; ?</AlertDialogTitle>
          <AlertDialogDescription>
            Ce rôle sera retiré de la classe et ne sera plus pris en compte dans le calcul du ratio
            d&apos;équilibre.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Suppression..." : "Supprimer le rôle"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
