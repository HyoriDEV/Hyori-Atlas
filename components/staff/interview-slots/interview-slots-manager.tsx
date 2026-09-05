"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarBlank,
  CalendarCheck,
  ClockCountdown,
  DotsThreeVertical,
  MagnifyingGlass,
  Table as TableIcon,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  deleteBatchInterviewSlots,
  deletePastUnbookedSlots,
} from "@/lib/actions/interview-slot-actions";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { CreateInterviewSlotDialog } from "./create-interview-slot-dialog";
import { InterviewCalendarView } from "./interview-calendar-view";
import { InterviewTableView } from "./interview-table-view";
import type { InterviewSlotItem, InterviewSlotsKPIs } from "./types";

interface InterviewSlotsManagerProps {
  initialSlots: InterviewSlotItem[];
  kpis: InterviewSlotsKPIs;
}

type StatusFilter = "all" | "today" | "upcoming" | "booked" | "available" | "past";
type ViewMode = "calendar" | "table";

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function InterviewSlotsManager({ initialSlots, kpis }: InterviewSlotsManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [confirmCleanPast, setConfirmCleanPast] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filtrage combiné : statut + recherche textuelle
  const filteredSlots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    return initialSlots.filter((slot) => {
      const slotDate = new Date(slot.startsAt);
      const isSlotPast = slotDate < now;
      const isSlotToday = isToday(slotDate);
      const isSlotBooked = Boolean(slot.booking);

      // Filtre de statut
      switch (statusFilter) {
        case "today":
          if (!isSlotToday) return false;
          break;
        case "upcoming":
          if (isSlotPast) return false;
          break;
        case "booked":
          if (!isSlotBooked) return false;
          break;
        case "available":
          if (isSlotBooked || isSlotPast) return false;
          break;
        case "past":
          if (!isSlotPast) return false;
          break;
        case "all":
        default:
          break;
      }

      // Filtre de recherche
      if (query) {
        const booking = slot.booking;
        if (!booking) return false;
        const player = booking.player;
        const mcName = (player.minecraftUsername ?? "").toLowerCase();
        const discDisplayName = (player.discordDisplayName ?? "").toLowerCase();
        const discUsername = (player.discordUsername ?? "").toLowerCase();

        return (
          mcName.includes(query) || discDisplayName.includes(query) || discUsername.includes(query)
        );
      }

      return true;
    });
  }, [initialSlots, statusFilter, searchQuery]);

  // Gestion de la sélection multiple
  function handleToggleSelectSlot(id: string) {
    setSelectedSlotIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll(ids: string[]) {
    const allSelected = ids.every((id) => selectedSlotIds.includes(id));
    if (allSelected) {
      setSelectedSlotIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSlotIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  function handleBatchDelete() {
    if (selectedSlotIds.length === 0) return;
    startTransition(async () => {
      try {
        const res = await deleteBatchInterviewSlots(selectedSlotIds);
        toast.success(`${res.deletedCount} créneau(x) supprimé(s).`);
        setSelectedSlotIds([]);
        setConfirmBatchDelete(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  }

  function handleCleanPast() {
    startTransition(async () => {
      try {
        const res = await deletePastUnbookedSlots();
        toast.success(
          res.deletedCount > 0
            ? `${res.deletedCount} créneau(x) passé(s) non réservé(s) nettoyé(s).`
            : "Aucun créneau passé à nettoyer."
        );
        setConfirmCleanPast(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du nettoyage.");
      }
    });
  }

  // Compteurs pour les filtres
  const counts = useMemo(() => {
    const now = new Date();
    let todayCount = 0;
    let upcomingCount = 0;
    let bookedCount = 0;
    let availableCount = 0;
    let pastCount = 0;

    for (const slot of initialSlots) {
      const d = new Date(slot.startsAt);
      const isPast = d < now;
      if (isToday(d)) todayCount++;
      if (!isPast) upcomingCount++;
      if (slot.booking) bookedCount++;
      if (!slot.booking && !isPast) availableCount++;
      if (isPast) pastCount++;
    }

    return {
      all: initialSlots.length,
      today: todayCount,
      upcoming: upcomingCount,
      booked: bookedCount,
      available: availableCount,
      past: pastCount,
    };
  }, [initialSlots]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. En-tête : Titre & Actions principales */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-semibold">
            Créneaux d&apos;entretien
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Gérez le planning des entretiens whitelist avec les candidats acceptés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" className="gap-1.5" />}
            >
              <DotsThreeVertical className="size-4" />
              Options
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setConfirmCleanPast(true)}
                disabled={isPending || counts.past === 0}
                className="text-destructive focus:text-destructive gap-2"
              >
                <Trash className="size-4" />
                Nettoyer les créneaux passés ({counts.past})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <CreateInterviewSlotDialog />
        </div>
      </div>

      {/* 2. Cartes de statistiques / KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Aujourd'hui */}
        <Card className="gap-0 overflow-hidden border p-0">
          <CardContent className="flex flex-col justify-between gap-2.5 p-4">
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="text-xs font-medium">Aujourd&apos;hui</span>
              <CalendarCheck className="text-primary size-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-foreground text-2xl font-bold">
                {kpis.totalToday}
              </span>
              <span className="text-muted-foreground text-xs">
                entretien{kpis.totalToday > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[11px]">
              {kpis.nextInterviewDate
                ? `Prochain : ${formatDate(new Date(kpis.nextInterviewDate), {
                    style: "chat",
                    withTime: true,
                  })}`
                : "Aucun entretien aujourd'hui"}
            </p>
          </CardContent>
        </Card>

        {/* À venir */}
        <Card className="gap-0 overflow-hidden border p-0">
          <CardContent className="flex flex-col justify-between gap-2.5 p-4">
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="text-xs font-medium">À venir</span>
              <ClockCountdown className="size-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-foreground text-2xl font-bold">
                {kpis.totalUpcoming}
              </span>
              <span className="text-muted-foreground text-xs">
                créneau{kpis.totalUpcoming > 1 ? "x" : ""}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[11px]">
              Total programmé dans le futur
            </p>
          </CardContent>
        </Card>

        {/* Réservés */}
        <Card className="gap-0 overflow-hidden border p-0">
          <CardContent className="flex flex-col justify-between gap-2.5 p-4">
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="text-xs font-medium">Réservés</span>
              <UsersThree className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-foreground text-2xl font-bold">
                {kpis.totalBooked}
              </span>
              <span className="text-muted-foreground text-xs">
                (
                {kpis.totalUpcoming > 0
                  ? Math.round((kpis.totalBooked / kpis.totalUpcoming) * 100)
                  : 0}
                % rempli)
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[11px]">
              Candidats en attente d&apos;appel
            </p>
          </CardContent>
        </Card>

        {/* Disponibles */}
        <Card className="gap-0 overflow-hidden border p-0">
          <CardContent className="flex flex-col justify-between gap-2.5 p-4">
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="text-xs font-medium">Disponibles</span>
              <CalendarBlank className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-foreground text-2xl font-bold">
                {kpis.totalAvailable}
              </span>
              <span className="text-muted-foreground text-xs">
                libre{kpis.totalAvailable > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[11px]">Prêts à être réservés</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barre d'outils (Filtres, Recherche, Bascule de vue) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Pills de filtrage par statut */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={statusFilter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("upcoming")}
            className="h-8 text-xs font-medium"
          >
            À venir ({counts.upcoming})
          </Button>
          <Button
            variant={statusFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("today")}
            className="h-8 text-xs font-medium"
          >
            Aujourd&apos;hui ({counts.today})
          </Button>
          <Button
            variant={statusFilter === "booked" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("booked")}
            className="h-8 text-xs font-medium"
          >
            Réservés ({counts.booked})
          </Button>
          <Button
            variant={statusFilter === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("available")}
            className="h-8 text-xs font-medium"
          >
            Libres ({counts.available})
          </Button>
          <Button
            variant={statusFilter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("past")}
            className="h-8 text-xs font-medium"
          >
            Passés ({counts.past})
          </Button>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 text-xs font-medium"
          >
            Tous ({counts.all})
          </Button>
        </div>

        {/* Côté droit : Recherche + Bascule de vue */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px] sm:w-64">
            <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Rechercher un joueur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="bg-muted inline-flex items-center rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Agenda"
            >
              <CalendarBlank className="size-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Tableau"
            >
              <TableIcon className="size-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Barre d'action de sélection multiple (si créneaux sélectionnés en vue tableau) */}
      {selectedSlotIds.length > 0 && viewMode === "table" && (
        <div className="bg-primary/10 border-primary/20 flex items-center justify-between rounded-lg border p-3">
          <span className="text-primary text-xs font-medium">
            {selectedSlotIds.length} créneau(x) libre(s) sélectionné(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSlotIds([])}
              className="h-7 text-xs"
            >
              Désélectionner
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBatchDelete(true)}
              className="h-7 gap-1 text-xs"
            >
              <Trash className="size-3.5" />
              Supprimer la sélection
            </Button>
          </div>
        </div>
      )}

      {/* 5. Affichage principal selon la vue active */}
      {viewMode === "calendar" ? (
        <InterviewCalendarView slots={filteredSlots} />
      ) : (
        <InterviewTableView
          slots={filteredSlots}
          selectedSlotIds={selectedSlotIds}
          onToggleSelectSlot={handleToggleSelectSlot}
          onToggleSelectAll={handleToggleSelectAll}
        />
      )}

      {/* Modale de confirmation de nettoyage des créneaux passés */}
      <AlertDialog open={confirmCleanPast} onOpenChange={setConfirmCleanPast}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nettoyer les créneaux passés expirés ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les créneaux dont la date est antérieure à maintenant et qui n&apos;ont jamais
              été réservés par un joueur seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCleanPast} disabled={isPending}>
              Nettoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modale de confirmation de suppression groupée */}
      <AlertDialog open={confirmBatchDelete} onOpenChange={setConfirmBatchDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer les {selectedSlotIds.length} créneaux sélectionnés ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les créneaux libres sélectionnés ne seront plus
              disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={isPending}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
