"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, ShieldWarning, WarningCircle } from "@phosphor-icons/react";

import {
  excludePlayer,
  suspendPlayer,
  warnPlayer,
  type SuspensionUnit,
} from "@/lib/actions/sanction-actions";
import { PlayerSelect, type PlayerOption, getPlayerDisplayName } from "@/components/player-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SanctionKind = "warning" | "suspension" | "exclusion";

const UNIT_LABELS: Record<SuspensionUnit, string> = {
  minutes: "Minutes",
  hours: "Heures",
  days: "Jours",
  weeks: "Semaines",
};

const REASON_MAX_LENGTH = 500;

interface NewSanctionDialogProps {
  availablePlayers: PlayerOption[];
}

export function NewSanctionDialog({ availablePlayers }: NewSanctionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
  const [kind, setKind] = useState<SanctionKind>("warning");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<SuspensionUnit>("days");
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    setSelectedPlayerId(null);
    setSelectedPlayer(null);
    setKind("warning");
    setReason("");
    setAmount("1");
    setUnit("days");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      handleReset();
    }
  }

  function handleSubmit() {
    if (!selectedPlayerId || !selectedPlayer) {
      toast.error("Veuillez sélectionner un joueur.");
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("La raison de la sanction est obligatoire.");
      return;
    }

    const parsedAmount = Number(amount);
    if (kind === "suspension" && (!Number.isInteger(parsedAmount) || parsedAmount <= 0)) {
      toast.error("La durée de la suspension doit être un nombre entier positif.");
      return;
    }

    const pseudo = getPlayerDisplayName(selectedPlayer);

    startTransition(async () => {
      try {
        if (kind === "warning") {
          await warnPlayer(selectedPlayerId, trimmedReason);
          toast.success(`${pseudo} a reçu un avertissement.`);
        } else if (kind === "suspension") {
          await suspendPlayer(selectedPlayerId, trimmedReason, parsedAmount, unit);
          toast.success(`${pseudo} a été suspendu.`);
        } else if (kind === "exclusion") {
          await excludePlayer(selectedPlayerId, trimmedReason);
          toast.success(`${pseudo} a été exclu définitivement.`);
        }
        setOpen(false);
        handleReset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        <span>Nouvelle sanction</span>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Appliquer une sanction</DialogTitle>
          <DialogDescription>
            Enregistrer un avertissement, une suspension temporaire ou une exclusion définitive.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Sélection du joueur */}
          <div className="flex flex-col gap-1.5">
            <Label>Joueur ciblé</Label>
            <PlayerSelect
              players={availablePlayers}
              value={selectedPlayerId}
              onChange={(playerId, player) => {
                setSelectedPlayerId(playerId);
                setSelectedPlayer(player);
              }}
              placeholder="Sélectionner un joueur..."
              searchPlaceholder="Rechercher par pseudo ou nom RP..."
              disabled={isPending}
            />
          </div>

          {/* Choix du type de sanction */}
          <div className="flex flex-col gap-1.5">
            <Label>Type de sanction</Label>
            <Tabs
              value={kind}
              onValueChange={(val) => setKind(val as SanctionKind)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="warning" disabled={isPending}>
                  Avertissement
                </TabsTrigger>
                <TabsTrigger value="suspension" disabled={isPending}>
                  Suspension
                </TabsTrigger>
                <TabsTrigger value="exclusion" disabled={isPending}>
                  Exclusion
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Durée de suspension si suspension */}
          {kind === "suspension" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sanction-duration">Durée de la suspension</Label>
              <div className="flex gap-2">
                <Input
                  id="sanction-duration"
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                    {(Object.keys(UNIT_LABELS) as SuspensionUnit[]).map((val) => (
                      <SelectItem key={val} value={val}>
                        {UNIT_LABELS[val]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Motif / Raison */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sanction-reason">Motif</Label>
              <span className="text-muted-foreground text-xs">
                {reason.length}/{REASON_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="sanction-reason"
              placeholder="Expliquez la raison de la sanction..."
              value={reason}
              maxLength={REASON_MAX_LENGTH}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant={kind === "warning" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={isPending || !selectedPlayerId || !reason.trim()}
          >
            {isPending ? "Application..." : "Appliquer la sanction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
