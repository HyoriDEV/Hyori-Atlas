"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  Clock,
  Eye,
  Gavel,
  ShieldWarning,
  User as UserIcon,
} from "@phosphor-icons/react";

import { revokeSanction } from "@/lib/actions/sanction-actions";
import { formatDate } from "@/lib/date";
import { SanctionSource, SanctionType } from "@/lib/generated/prisma/enums";
import { sanctionSourceLabels, sanctionTypeLabels } from "@/lib/navigation";
import {
  sanctionStatusBadgeVariant,
  sanctionTypeBadgeVariant,
} from "@/lib/atlas-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkinHead } from "@/components/ui/skin-head";
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

export interface SanctionRowData {
  id: string;
  userId: string;
  type: SanctionType;
  reason: string;
  expiresAt: Date | null;
  source: SanctionSource;
  issuedById: string | null;
  issuedByName: string | null;
  revokedAt: Date | null;
  revokedById: string | null;
  revokedByName: string | null;
  createdAt: Date;
  user: {
    id: string;
    minecraftUsername: string | null;
    discordDisplayName: string | null;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
  };
  issuedBy?: {
    id: string;
    minecraftUsername: string | null;
    discordDisplayName: string | null;
    discordUsername: string | null;
  } | null;
  revokedBy?: {
    id: string;
    minecraftUsername: string | null;
    discordDisplayName: string | null;
    discordUsername: string | null;
  } | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}

interface SanctionRowActionsProps {
  sanction: SanctionRowData;
}

export function SanctionRowActions({ sanction }: SanctionRowActionsProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const playerDisplayName =
    sanction.user.minecraftUsername ??
    sanction.user.discordDisplayName ??
    sanction.user.discordUsername ??
    "Joueur";

  const issuerName =
    sanction.issuedByName ??
    sanction.issuedBy?.minecraftUsername ??
    sanction.issuedBy?.discordDisplayName ??
    "Staff";

  const revokerName =
    sanction.revokedByName ??
    sanction.revokedBy?.minecraftUsername ??
    sanction.revokedBy?.discordDisplayName ??
    "Staff";

  const isActive = sanction.status === "ACTIVE";

  function handleRevokeConfirm() {
    startTransition(async () => {
      try {
        await revokeSanction(sanction.userId, sanction.id);
        toast.success(`La sanction de ${playerDisplayName} a été levée.`);
        setRevokeOpen(false);
        setDetailsOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setDetailsOpen(true)}
          title="Consulter les détails de la sanction"
        >
          <Eye className="size-3.5" />
          <span className="hidden sm:inline">Détails</span>
        </Button>

        {isActive && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setRevokeOpen(true)}
            title="Lever cette sanction"
          >
            <ArrowCounterClockwise className="size-3.5" />
            <span>Lever</span>
          </Button>
        )}
      </div>

      {/* Dialog Détails */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Gavel className="text-primary size-5" />
              <DialogTitle>Détails de la sanction</DialogTitle>
            </div>
            <DialogDescription>
              Historique complet et audit de la sanction appliquée.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-sm">
            {/* Cible de la sanction */}
            <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <SkinHead size="default" username={sanction.user.minecraftUsername ?? undefined} />
                <div>
                  <div className="font-semibold">{playerDisplayName}</div>
                  <div className="text-muted-foreground text-xs">
                    {sanction.user.minecraftUsername ? `Minecraft: ${sanction.user.minecraftUsername}` : null}
                    {sanction.user.discordUsername ? ` · Discord: @${sanction.user.discordUsername}` : null}
                  </div>
                </div>
              </div>
              <Link
                href={`/staff/atlas/${sanction.userId}`}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
              >
                <span>Fiche Atlas</span>
                <ArrowSquareOut className="size-3" />
              </Link>
            </div>

            {/* Badges Type, Statut, Source */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sanctionTypeBadgeVariant(sanction.type)}>
                {sanctionTypeLabels[sanction.type]}
              </Badge>
              <Badge variant={sanctionStatusBadgeVariant(sanction.status)}>
                {sanction.status === "ACTIVE" ? "Active" : sanction.status === "EXPIRED" ? "Expirée" : "Levée"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sanctionSourceLabels[sanction.source]}
              </Badge>
            </div>

            {/* Motif / Raison */}
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Motif de la sanction</span>
              <div className="border-border/80 bg-background rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
                {sanction.reason}
              </div>
            </div>

            {/* Audit / Chronologie */}
            <div className="border-border/60 flex flex-col gap-2 rounded-lg border p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Appliquée le :</span>
                <span className="font-medium">
                  {formatDate(sanction.createdAt, { style: "prefix-long", withTime: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Émise par :</span>
                <span className="font-medium">{issuerName}</span>
              </div>

              {sanction.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {sanction.status === "EXPIRED" ? "Expirée le :" : "Expire le :"}
                  </span>
                  <span className="font-medium">
                    {formatDate(sanction.expiresAt, { style: "prefix-long", withTime: true })}
                  </span>
                </div>
              )}

              {sanction.revokedAt && (
                <div className="border-border/40 mt-1 flex flex-col gap-1 border-t pt-1.5">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Levée le :</span>
                    <span className="font-medium">
                      {formatDate(sanction.revokedAt, { style: "prefix-long", withTime: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Levée par :</span>
                    <span className="font-medium">{revokerName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isActive && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDetailsOpen(false);
                  setRevokeOpen(true);
                }}
              >
                <ArrowCounterClockwise className="mr-1.5 size-3.5" />
                Lever la sanction
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation de levée */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lever la sanction</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir lever cette sanction pour{" "}
              <strong>{playerDisplayName}</strong> ? Le joueur pourra de nouveau se
              connecter au serveur si aucune autre exclusion ou suspension n'est active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={isPending}
              variant="destructive"
            >
              Lever la sanction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
