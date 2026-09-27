"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  excludePlayer,
  revokeSanction,
  suspendPlayer,
  warnPlayer,
  type SuspensionUnit,
} from "@/lib/actions/sanction-actions";
import { formatDate } from "@/lib/date";
import { AtlasRevokeWhitelistButton } from "@/components/dashboard/atlas-revoke-whitelist-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SanctionKind = "warning" | "suspension" | "exclusion";

const UNIT_LABELS: Record<SuspensionUnit, string> = {
  minutes: "Minutes",
  hours: "Heures",
  days: "Jours",
  weeks: "Semaines",
};

const REASON_MAX_LENGTH = 500;

const KIND_CONFIG: Record<
  SanctionKind,
  { button: string; title: string; description: string; confirm: string; success: string }
> = {
  warning: {
    button: "Avertissement",
    title: "Avertir le joueur",
    description: "L'avertissement est enregistré et affiché en jeu si le joueur est connecté.",
    confirm: "Avertir",
    success: "a reçu un avertissement.",
  },
  suspension: {
    button: "Suspendre",
    title: "Suspendre le joueur",
    description:
      "Le joueur est expulsé s'il est connecté et ne peut plus rejoindre le serveur pendant la durée choisie.",
    confirm: "Suspendre",
    success: "a été suspendu.",
  },
  exclusion: {
    button: "Exclure",
    title: "Exclure le joueur",
    description:
      "Le joueur est expulsé s'il est connecté et ne peut plus jamais rejoindre le serveur.",
    confirm: "Exclure",
    success: "a été exclu définitivement.",
  },
};

function SanctionDialog({
  kind,
  playerId,
  pseudo,
}: {
  kind: SanctionKind;
  playerId: string;
  pseudo: string;
}) {
  const config = KIND_CONFIG[kind];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<SuspensionUnit>("days");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setReason("");
      setAmount("1");
      setUnit("days");
    }
  }

  function handleConfirm() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("La raison est obligatoire.");
      return;
    }
    const parsedAmount = Number(amount);
    if (kind === "suspension" && (!Number.isInteger(parsedAmount) || parsedAmount <= 0)) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }

    startTransition(async () => {
      try {
        if (kind === "warning") await warnPlayer(playerId, trimmedReason);
        if (kind === "suspension") await suspendPlayer(playerId, trimmedReason, parsedAmount, unit);
        if (kind === "exclusion") await excludePlayer(playerId, trimmedReason);
        toast.success(`${pseudo} ${config.success}`);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={<Button size="sm" variant={kind === "warning" ? "outline" : "destructive"} />}
      >
        {config.button}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {pseudo} — {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          {kind === "suspension" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sanction-amount-${kind}`}>Durée</Label>
              <div className="flex gap-2">
                <Input
                  id={`sanction-amount-${kind}`}
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isPending}
                  className="w-24"
                />
                <Select
                  value={unit}
                  onValueChange={(value) => setUnit(value as SuspensionUnit)}
                  disabled={isPending}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue>{UNIT_LABELS[unit]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(UNIT_LABELS) as SuspensionUnit[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {UNIT_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`sanction-reason-${kind}`}>Raison</Label>
            <Textarea
              id={`sanction-reason-${kind}`}
              value={reason}
              maxLength={REASON_MAX_LENGTH}
              onChange={(event) => setReason(event.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
            variant={kind === "warning" ? "default" : "destructive"}
          >
            {config.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RevokeBanButton({
  playerId,
  pseudo,
  sanctionId,
}: {
  playerId: string;
  pseudo: string;
  sanctionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await revokeSanction(playerId, sanctionId);
        toast.success(`La sanction de ${pseudo} a été levée.`);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
        Lever
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lever la sanction</AlertDialogTitle>
          <AlertDialogDescription>
            {pseudo} pourra de nouveau rejoindre le serveur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            Lever la sanction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AtlasActiveBan {
  id: string;
  isExclusion: boolean;
  reason: string;
  expiresAt: Date | null;
}

export function AtlasSanctionCard({
  playerId,
  pseudo,
  activeBan,
  canRevokeWhitelist,
}: {
  playerId: string;
  pseudo: string;
  activeBan: AtlasActiveBan | null;
  canRevokeWhitelist?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Actions
      </span>

      {activeBan && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">
              {activeBan.isExclusion
                ? "Exclu définitivement"
                : `Suspendu jusqu'au ${formatDate(activeBan.expiresAt, { style: "compact", withYear: true })}`}
            </span>
            <span className="text-muted-foreground text-xs">Raison : {activeBan.reason}</span>
          </div>
          <RevokeBanButton playerId={playerId} pseudo={pseudo} sanctionId={activeBan.id} />
        </div>
      )}

      {!activeBan && (
        <div className="flex flex-wrap gap-2">
          {canRevokeWhitelist && <AtlasRevokeWhitelistButton playerId={playerId} pseudo={pseudo} />}
          <SanctionDialog kind="warning" playerId={playerId} pseudo={pseudo} />
          <SanctionDialog kind="suspension" playerId={playerId} pseudo={pseudo} />
          <SanctionDialog kind="exclusion" playerId={playerId} pseudo={pseudo} />
        </div>
      )}
    </Card>
  );
}
