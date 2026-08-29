"use client";

import { useState, useTransition } from "react";

import {
  deleteInterviewSlot,
  updateInterviewBookingStatus,
} from "@/lib/actions/interview-slot-actions";
import { InterviewBookingStatus } from "@/lib/generated/prisma/enums";
import { interviewBookingStatusLabels } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
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

const bookingStatusItems = Object.values(InterviewBookingStatus).map((status) => ({
  value: status,
  label: interviewBookingStatusLabels[status],
}));

export function InterviewSlotRowActions({
  slotId,
  bookingId,
  bookingStatus,
}: {
  slotId: string;
  bookingId: string | null;
  bookingStatus: InterviewBookingStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (bookingId && bookingStatus) {
    return (
      <Select
        items={bookingStatusItems}
        value={bookingStatus}
        onValueChange={(value) => {
          startTransition(async () => {
            await updateInterviewBookingStatus(bookingId, value as InterviewBookingStatus);
          });
        }}
      >
        <SelectTrigger disabled={isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bookingStatusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
        Supprimer
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce créneau</AlertDialogTitle>
          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                await deleteInterviewSlot(slotId);
                setConfirmDelete(false);
              })
            }
            disabled={isPending}
          >
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
