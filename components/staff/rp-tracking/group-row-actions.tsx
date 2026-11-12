"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DotsThreeVertical, PencilSimple, Trash, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

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
import { EditGroupDialog } from "@/components/staff/rp-tracking/edit-group-dialog";
import { deleteRpTrackingGroupAction } from "@/lib/actions/group-rp-tracking-actions";
import type { RpTrackingGroupSummary } from "@/lib/services/group-rp-tracking-service";

export function GroupRowActions({ group, isAdmin }: { group: RpTrackingGroupSummary; isAdmin?: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDeleteConfirm() {
    startDeleteTransition(async () => {
      const res = await deleteRpTrackingGroupAction(group.id);
      if (!res.success) {
        toast.error(res.error || "Échec de la suppression.");
        return;
      }

      toast.success(`Le groupe « ${group.name} » a été supprimé.`);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              title="Actions du groupe"
              disabled={isDeleting}
            />
          }
        >
          <DotsThreeVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilSimple className="size-3.5" />
            <span>Modifier</span>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash className="size-3.5" />
                <span>Supprimer</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditGroupDialog group={group} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe de suivi RP ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le groupe{" "}
              <strong>« {group.name} »</strong> ?
              <br />
              Cette action supprimera également tous les échanges associés pour l&apos;ensemble des
              membres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <CircleNotch className="size-4 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <span>Supprimer</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
