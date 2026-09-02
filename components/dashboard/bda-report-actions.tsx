"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { updateBdaReportStatus, deleteBdaReport } from "@/lib/actions/bda-actions";
import { BdaReportStatus } from "@/lib/generated/prisma/enums";
import { CircleNotch, Check, Archive, Trash, ArrowUUpLeft } from "@phosphor-icons/react";

export function BdaReportActions({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: BdaReportStatus;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<BdaReportStatus | "DELETE" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isArchived = currentStatus === BdaReportStatus.ARCHIVED;

  const handleUpdateStatus = async (status: BdaReportStatus) => {
    if (isArchived && status === BdaReportStatus.UNREAD) return;

    setIsLoading(status);
    try {
      await updateBdaReportStatus(reportId, status);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading("DELETE");
    try {
      await deleteBdaReport(reportId);
      toast.success("Rapport supprimé avec succès.");
      setDeleteDialogOpen(false);
      router.push("/staff/bda-reports");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression du rapport.");
      setIsLoading(null);
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        {currentStatus !== BdaReportStatus.UNREAD && (
          <Button
            variant="outline"
            className="w-full justify-center"
            disabled={!!isLoading || isArchived}
            onClick={() => handleUpdateStatus(BdaReportStatus.UNREAD)}
          >
            {isLoading === BdaReportStatus.UNREAD ? (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowUUpLeft className="mr-2 h-4 w-4" />
            )}
            Marquer comme non lu
          </Button>
        )}

        {!isArchived && currentStatus !== BdaReportStatus.RESOLVED && (
          <Button
            variant="default"
            className="w-full justify-center"
            disabled={!!isLoading}
            onClick={() => handleUpdateStatus(BdaReportStatus.RESOLVED)}
          >
            {isLoading === BdaReportStatus.RESOLVED ? (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Marquer comme résolu
          </Button>
        )}

        {isArchived ? (
          <Button
            variant="secondary"
            className="w-full justify-center"
            disabled={!!isLoading}
            onClick={() => handleUpdateStatus(BdaReportStatus.RESOLVED)}
          >
            {isLoading === BdaReportStatus.RESOLVED ? (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowUUpLeft className="mr-2 h-4 w-4" />
            )}
            Annuler l&apos;archivage
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full justify-center"
            disabled={!!isLoading}
            onClick={() => handleUpdateStatus(BdaReportStatus.ARCHIVED)}
          >
            {isLoading === BdaReportStatus.ARCHIVED ? (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Archiver le rapport
          </Button>
        )}

        <Button
          variant="destructive"
          className="w-full justify-center"
          disabled={!!isLoading}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {isLoading === "DELETE" ? (
            <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash className="mr-2 h-4 w-4" />
          )}
          Supprimer le rapport
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rapport</AlertDialogTitle>
            <AlertDialogDescription>
              Es-tu sûr de vouloir supprimer ce rapport GC ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === "DELETE"}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isLoading === "DELETE"}
            >
              {isLoading === "DELETE" ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
