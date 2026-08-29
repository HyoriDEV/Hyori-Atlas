import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { interviewBookingStatusLabels } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateInterviewSlotDialog } from "@/components/dashboard/create-interview-slot-dialog";
import { InterviewSlotRowActions } from "@/components/dashboard/interview-slot-row-actions";

export default async function InterviewSlotsPage() {
  await requireRole([Role.ADMIN]);

  const slots = await prisma.interviewSlot.findMany({
    include: { booking: { include: { player: true } } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Créneaux d&apos;entretien</h1>
        <CreateInterviewSlotDialog />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead>Joueur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">
                  Aucun créneau créé pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              slots.map((slot) => {
                const booking = slot.booking;
                const playerName = booking
                  ? (booking.player.minecraftUsername ?? booking.player.discordDisplayName)
                  : null;

                return (
                  <TableRow key={slot.id}>
                    <TableCell>
                      {formatDate(slot.startsAt, { style: "prefix-long", withTime: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={booking ? "secondary" : "outline"}>
                        {booking ? interviewBookingStatusLabels[booking.status] : "Disponible"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{playerName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <InterviewSlotRowActions
                          slotId={slot.id}
                          bookingId={booking?.id ?? null}
                          bookingStatus={booking?.status ?? null}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
