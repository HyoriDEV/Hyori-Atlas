"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fr } from "date-fns/locale";
import {
  CalendarBlank,
  Clock,
  User,
  Copy,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  CalendarCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { InterviewBookingStatus } from "@/lib/generated/prisma/enums";
import { interviewBookingStatusLabels } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { InterviewSlotRowActions } from "./interview-slot-row-actions";
import type { InterviewSlotItem } from "./types";

interface InterviewCalendarViewProps {
  slots: InterviewSlotItem[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getDayHeading(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = formatDate(date, { style: "prefix-long", withTime: false, withYear: true });

  if (diffDays === 0) return `Aujourd'hui (${formattedDate})`;
  if (diffDays === 1) return `Demain (${formattedDate})`;
  if (diffDays === -1) return `Hier (${formattedDate})`;
  return formattedDate;
}

export function InterviewCalendarView({ slots }: InterviewCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Tous les jours qui comportent au moins un créneau
  const daysWithSlots = useMemo(() => {
    return slots.map((s) => new Date(s.startsAt));
  }, [slots]);

  // Créneaux filtrés par la date sélectionnée (ou tous si aucune date sélectionnée)
  const filteredSlots = useMemo(() => {
    if (!selectedDate) return slots;
    return slots.filter((slot) => isSameDay(new Date(slot.startsAt), selectedDate));
  }, [slots, selectedDate]);

  // Regroupement par jour
  const groupedSlots = useMemo(() => {
    const map = new Map<string, { date: Date; items: InterviewSlotItem[] }>();

    for (const slot of filteredSlots) {
      const d = new Date(slot.startsAt);
      const key = getDayKey(d);

      if (!map.has(key)) {
        map.set(key, { date: d, items: [] });
      }
      map.get(key)!.items.push(slot);
    }

    // Trier par date
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredSlots]);

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Colonne latérale : Mini-Calendrier interactif */}
      <div className="flex shrink-0 flex-col gap-4 lg:w-80">
        <Card className="gap-0 overflow-hidden border p-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between pb-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Calendrier
              </span>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="text-primary h-6 px-2 text-xs"
                >
                  Voir tout
                </Button>
              )}
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              modifiers={{
                hasSlots: (date) => daysWithSlots.some((d) => isSameDay(d, date)),
              }}
              modifiersClassNames={{
                hasSlots:
                  "font-bold text-primary underline underline-offset-4 decoration-primary/60",
              }}
              className="w-full p-0"
            />
          </CardContent>
        </Card>

        {/* Légende rapide */}
        <div className="bg-card flex flex-col gap-2.5 rounded-lg border p-4 text-xs">
          <span className="text-foreground font-semibold">Légende des créneaux</span>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Accepté</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Inscrit (en attente)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Modifications demandées</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-muted-foreground/50 size-2 rounded-full" />
            <span className="text-muted-foreground">Disponible</span>
          </div>
        </div>
      </div>

      {/* Colonne centrale : Agenda détaillé par journée */}
      <div className="flex flex-1 flex-col gap-6">
        {groupedSlots.length === 0 ? (
          <div className="bg-card flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <CalendarBlank className="text-muted-foreground/40 mb-3 size-12" />
            <h3 className="text-foreground font-heading text-base font-semibold">
              {selectedDate ? "Aucun créneau pour ce jour" : "Aucun créneau trouvé"}
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              {selectedDate
                ? "Il n'y a aucun créneau programmé à cette date. Utilisez le bouton 'Nouveau créneau' pour en planifier."
                : "Créez de nouveaux créneaux pour ouvrir les entretiens whitelist."}
            </p>
            {selectedDate && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSelectedDate(undefined)}
              >
                Afficher tous les jours
              </Button>
            )}
          </div>
        ) : (
          groupedSlots.map(({ date, items }) => {
            const isToday = isSameDay(date, new Date());
            return (
              <div key={getDayKey(date)} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck
                    className={`size-4 ${isToday ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <h3
                    className={`font-heading text-sm font-semibold ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {getDayHeading(date)}
                  </h3>
                  <Badge variant={isToday ? "default" : "secondary"} className="text-xs">
                    {items.length} créneau{items.length > 1 ? "x" : ""}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((slot) => {
                    const slotDate = new Date(slot.startsAt);
                    const isPast = slotDate < new Date();
                    const booking = slot.booking;
                    const player = booking?.player;

                    return (
                      <Card
                        key={slot.id}
                        className={`group relative gap-0 overflow-hidden border p-0 transition-all ${
                          booking
                            ? "bg-card hover:border-primary/40 shadow-xs"
                            : "bg-muted/10 hover:bg-muted/20 border-dashed"
                        } ${isPast ? "opacity-75" : ""}`}
                      >
                        <CardContent className="flex flex-col justify-between gap-3 p-4">
                          {/* En-tête de carte : Heure + Badge Statut + Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-semibold">
                                <Clock className="size-3.5" />
                                {formatDate(slotDate, { style: "time-only" })}
                              </div>
                              {isPast && (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground text-[10px]"
                                >
                                  Passé
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {booking ? (
                                <Badge
                                  variant={
                                    booking.status === InterviewBookingStatus.ACCEPTED
                                      ? "default"
                                      : booking.status === InterviewBookingStatus.CHANGES_REQUESTED
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs font-medium"
                                >
                                  {booking.status === InterviewBookingStatus.ACCEPTED && (
                                    <CheckCircle className="mr-1 size-3" />
                                  )}
                                  {booking.status === InterviewBookingStatus.CHANGES_REQUESTED && (
                                    <WarningCircle className="mr-1 size-3" />
                                  )}
                                  {interviewBookingStatusLabels[booking.status]}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-xs">
                                  Disponible
                                </Badge>
                              )}

                              <InterviewSlotRowActions slot={slot} />
                            </div>
                          </div>

                          {/* Corps de carte : Joueur ou libre */}
                          {booking && player ? (
                            <div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-2.5">
                              <div className="flex min-w-0 items-center gap-2.5">
                                {player.minecraftUuid ? (
                                  <SkinHead
                                    username={player.minecraftUsername ?? player.discordDisplayName}
                                    size="sm"
                                    className="ring-border shrink-0 ring-1"
                                  />
                                ) : (
                                  <Avatar className="ring-border size-7 shrink-0 ring-1">
                                    <AvatarImage
                                      src={player.discordAvatarUrl ?? undefined}
                                      alt={player.discordDisplayName}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {player.discordDisplayName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}

                                <div className="flex min-w-0 flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-foreground truncate text-xs font-semibold">
                                      {player.minecraftUsername ?? player.discordDisplayName}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground truncate text-[11px]">
                                    @{player.discordUsername}
                                  </span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleCopy(player.discordUsername, "Tag Discord")}
                                  title="Copier le tag Discord"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                                <Button
                                  render={<Link href={`/staff/atlas/${player.id}`} />}
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Voir le dossier Atlas"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ArrowSquareOut className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <User className="size-4 opacity-50" />
                              <span>En attente de réservation par un joueur</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
