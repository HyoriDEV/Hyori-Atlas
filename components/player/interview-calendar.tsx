"use client";

import { useMemo, useState, useTransition } from "react";
import { fr } from "date-fns/locale";

import { bookInterviewSlot } from "@/lib/actions/interview-actions";
import { formatDate } from "@/lib/date";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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

export interface InterviewSlotInfo {
  id: string;
  startsAt: Date;
  isBooked: boolean;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function InterviewCalendar({
  slots,
  bookingDisabled,
}: {
  slots: InterviewSlotInfo[];
  bookingDisabled: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [pendingSlot, setPendingSlot] = useState<InterviewSlotInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableDays = useMemo(
    () => slots.filter((slot) => !slot.isBooked).map((slot) => slot.startsAt),
    [slots]
  );

  const daySlots = useMemo(
    () => (selectedDate ? slots.filter((slot) => isSameDay(slot.startsAt, selectedDate)) : []),
    [slots, selectedDate]
  );

  function handleConfirm() {
    if (!pendingSlot) return;
    setError(null);
    startTransition(async () => {
      try {
        await bookInterviewSlot(pendingSlot.id);
        setPendingSlot(null);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <Card className="w-fit">
        <CardContent>
          <Calendar
            mode="single"
            locale={fr}
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              available: (date) => availableDays.some((day) => isSameDay(day, date)),
            }}
            modifiersClassNames={{ available: "font-semibold text-primary" }}
          />
        </CardContent>
      </Card>
      <Card className="flex-1">
        <CardContent className="flex flex-col gap-3">
          <span className="font-heading text-base font-semibold">
            Créneaux disponibles à cette date
          </span>
          {daySlots.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {selectedDate ? "Aucun créneau." : "Choisis une date."}
            </p>
          )}
          {daySlots.map((slot) => (
            <Button
              key={slot.id}
              type="button"
              variant={slot.isBooked ? "outline" : "default"}
              disabled={slot.isBooked || bookingDisabled}
              onClick={() => setPendingSlot(slot)}
              className="justify-start"
            >
              {formatDate(slot.startsAt, { style: "compact", withTime: true })}
              {slot.isBooked ? " · Réservé" : ""}
            </Button>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingSlot} onOpenChange={(open) => !open && setPendingSlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réserver ce créneau</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSlot &&
                `Confirmer la réservation : ${formatDate(pendingSlot.startsAt, {
                  style: "prefix-long",
                  withTime: true,
                })} ?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
