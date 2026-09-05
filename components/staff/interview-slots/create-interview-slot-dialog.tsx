"use client";

import { useMemo, useState, useTransition } from "react";
import { fr } from "date-fns/locale";
import { CalendarBlank, Clock, Plus, Sparkle, Check } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  createBatchInterviewSlots,
  createInterviewSlot,
} from "@/lib/actions/interview-slot-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date";

function combineDateAndTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map((v) => parseInt(v, 10));
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 heure" },
];

const BREAK_OPTIONS = [
  { value: "0", label: "Sans pause (0 min)" },
  { value: "5", label: "5 min de pause" },
  { value: "10", label: "10 min de pause" },
  { value: "15", label: "15 min de pause" },
];

export function CreateInterviewSlotDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [isPending, startTransition] = useTransition();

  // Mode unitaire
  const [singleDate, setSingleDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [singleTime, setSingleTime] = useState<string>("15:00");

  // Mode batch
  const [batchDate, setBatchDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [startTime, setStartTime] = useState<string>("14:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [slotDuration, setSlotDuration] = useState<string>("30");
  const [breakDuration, setBreakDuration] = useState<string>("0");
  const [deselectedTimes, setDeselectedTimes] = useState<Set<string>>(new Set());

  // Raccourcis pour le mode unitaire
  function applyQuickPreset(daysOffset: number, time: string) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSingleDate(d);
    setSingleTime(time);
  }

  // Calcul dynamique des créneaux en mode batch
  const generatedBatchSlots = useMemo(() => {
    if (!batchDate || !startTime || !endTime) return [];

    const durationMin = parseInt(slotDuration, 10) || 30;
    const breakMin = parseInt(breakDuration, 10) || 0;
    const stepMin = durationMin + breakMin;

    const [startH, startM] = startTime.split(":").map((v) => parseInt(v, 10));
    const [endH, endM] = endTime.split(":").map((v) => parseInt(v, 10));

    const startTotal = (startH ?? 0) * 60 + (startM ?? 0);
    const endTotal = (endH ?? 0) * 60 + (endM ?? 0);

    if (startTotal >= endTotal || stepMin <= 0) return [];

    const slots: { time: string; date: Date }[] = [];
    let current = startTotal;

    while (current + durationMin <= endTotal) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      const slotDate = new Date(batchDate);
      slotDate.setHours(h, m, 0, 0);

      slots.push({ time: timeString, date: slotDate });
      current += stepMin;
    }

    return slots;
  }, [batchDate, startTime, endTime, slotDuration, breakDuration]);

  // Créneaux actuellement retenus
  const selectedBatchDates = useMemo(() => {
    return generatedBatchSlots.filter((s) => !deselectedTimes.has(s.time)).map((s) => s.date);
  }, [generatedBatchSlots, deselectedTimes]);

  function toggleSlotSelection(time: string) {
    setDeselectedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(time)) {
        next.delete(time);
      } else {
        next.add(time);
      }
      return next;
    });
  }

  function handleCreateSingle() {
    if (!singleDate || !singleTime) {
      toast.error("Veuillez sélectionner une date et une heure.");
      return;
    }

    const fullDate = combineDateAndTime(singleDate, singleTime);
    if (fullDate <= new Date()) {
      toast.error("Le créneau doit être programmé dans le futur.");
      return;
    }

    startTransition(async () => {
      try {
        await createInterviewSlot(fullDate);
        toast.success(
          `Créneau du ${formatDate(fullDate, { style: "prefix-long", withTime: true })} créé !`
        );
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la création.");
      }
    });
  }

  function handleCreateBatch() {
    if (selectedBatchDates.length === 0) {
      toast.error("Aucun créneau sélectionné à créer.");
      return;
    }

    const now = new Date();
    const futureDates = selectedBatchDates.filter((d) => d > now);
    if (futureDates.length === 0) {
      toast.error("Tous les créneaux sélectionnés sont déjà passés.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createBatchInterviewSlots(futureDates);
        toast.success(`${result.createdCount} créneau(x) d'entretien créé(s) avec succès !`);
        if (result.skippedCount > 0) {
          toast.info(`${result.skippedCount} créneau(x) existaient déjà et ont été ignorés.`);
        }
        setOpen(false);
        setDeselectedTimes(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la création groupée.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nouveau créneau
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarBlank className="text-primary size-5" />
            Planifier des créneaux d&apos;entretien
          </DialogTitle>
          <DialogDescription>
            Ajoute un créneau unique ou génère plusieurs créneaux d&apos;affilée pour la whitelist.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "single" | "batch")}
          className="mt-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <Clock className="size-4" />
              Créneau unitaire
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Sparkle className="size-4" />
              Générateur en masse
            </TabsTrigger>
          </TabsList>

          {/* Onglet 1 : Création unitaire */}
          <TabsContent value="single" className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Raccourcis rapides</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickPreset(0, "18:00")}
                >
                  Ce soir 18h00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickPreset(0, "21:00")}
                >
                  Ce soir 21h00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickPreset(1, "14:00")}
                >
                  Demain 14h00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickPreset(1, "18:00")}
                >
                  Demain 18h00
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Date de l&apos;entretien</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      />
                    }
                  >
                    <CalendarBlank className="mr-2 size-4" />
                    {singleDate
                      ? formatDate(singleDate, { style: "prefix-long", withTime: false })
                      : "Choisir une date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={singleDate}
                      onSelect={(d) => d && setSingleDate(d)}
                      locale={fr}
                      disabled={(d) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return d < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="single-time">Heure de début</Label>
                <Input
                  id="single-time"
                  type="time"
                  value={singleTime}
                  onChange={(e) => setSingleTime(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg border p-3 text-xs">
              <span className="text-muted-foreground">Aperçu du créneau : </span>
              <span className="text-foreground font-semibold">
                {singleDate && singleTime
                  ? formatDate(combineDateAndTime(singleDate, singleTime), {
                      style: "prefix-long",
                      withTime: true,
                    })
                  : "Sélectionnez date et heure"}
              </span>
            </div>
          </TabsContent>

          {/* Onglet 2 : Générateur en masse */}
          <TabsContent value="batch" className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2 sm:col-span-1">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      />
                    }
                  >
                    <CalendarBlank className="mr-2 size-4" />
                    {batchDate
                      ? formatDate(batchDate, { style: "compact", withTime: false })
                      : "Date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={batchDate}
                      onSelect={(d) => d && setBatchDate(d)}
                      locale={fr}
                      disabled={(d) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return d < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="batch-start">De</Label>
                <Input
                  id="batch-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="batch-end">À</Label>
                <Input
                  id="batch-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Durée par entretien</Label>
                <Select
                  value={slotDuration}
                  onValueChange={(val) => {
                    if (val) setSlotDuration(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Pause entre créneaux</Label>
                <Select
                  value={breakDuration}
                  onValueChange={(val) => {
                    if (val) setBreakDuration(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BREAK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prévisualisation des créneaux calculés */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Créneaux calculés ({selectedBatchDates.length}/{generatedBatchSlots.length}{" "}
                  retenus)
                </Label>
                {generatedBatchSlots.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      if (deselectedTimes.size === 0) {
                        // Tout décocher
                        setDeselectedTimes(new Set(generatedBatchSlots.map((s) => s.time)));
                      } else {
                        // Tout cocher
                        setDeselectedTimes(new Set());
                      }
                    }}
                  >
                    {deselectedTimes.size === 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                )}
              </div>

              {generatedBatchSlots.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
                  Ajustez les heures pour générer des créneaux.
                </p>
              ) : (
                <div className="bg-muted/20 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2.5">
                  {generatedBatchSlots.map(({ time }) => {
                    const isSelected = !deselectedTimes.has(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => toggleSlotSelection(time)}
                        className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground line-through opacity-60 hover:opacity-100"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Annuler
          </DialogClose>
          {activeTab === "single" ? (
            <Button type="button" onClick={handleCreateSingle} disabled={isPending || !singleDate}>
              Créer le créneau
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCreateBatch}
              disabled={isPending || selectedBatchDates.length === 0}
            >
              Créer {selectedBatchDates.length} créneaux
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
