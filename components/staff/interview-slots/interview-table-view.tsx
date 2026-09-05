"use client";

import Link from "next/link";
import {
  CalendarBlank,
  Clock,
  Copy,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { InterviewBookingStatus } from "@/lib/generated/prisma/enums";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { InterviewSlotRowActions } from "./interview-slot-row-actions";
import type { InterviewSlotItem } from "./types";

interface InterviewTableViewProps {
  slots: InterviewSlotItem[];
  selectedSlotIds: string[];
  onToggleSelectSlot: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}

function getRelativeTimeBadge(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isPast = diffMs < 0;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (isPast) {
    return {
      label: "Passé",
      variant: "outline" as const,
      className: "text-muted-foreground opacity-60",
    };
  }
  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours <= 1) {
      return {
        label: "Imminent",
        variant: "default" as const,
        className: "bg-primary text-primary-foreground font-semibold animate-pulse",
      };
    }
    return { label: "Aujourd'hui", variant: "default" as const, className: "" };
  }
  if (diffDays === 1) {
    return { label: "Demain", variant: "secondary" as const, className: "" };
  }
  return null;
}

export function InterviewTableView({
  slots,
  selectedSlotIds,
  onToggleSelectSlot,
  onToggleSelectAll,
}: InterviewTableViewProps) {
  // Seuls les créneaux libres peuvent être sélectionnés en masse
  const unbookedSlotIds = slots.filter((s) => !s.booking).map((s) => s.id);
  const allUnbookedSelected =
    unbookedSlotIds.length > 0 && unbookedSlotIds.every((id) => selectedSlotIds.includes(id));

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  }

  return (
    <Card className="gap-0 overflow-hidden border py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                aria-label="Tout sélectionner"
                checked={allUnbookedSelected}
                disabled={unbookedSlotIds.length === 0}
                onChange={() => onToggleSelectAll(unbookedSlotIds)}
                className="accent-primary size-4 cursor-pointer rounded disabled:opacity-40"
              />
            </TableHead>
            <TableHead>Horaire & Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Joueur concerné</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {slots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <CalendarBlank className="text-muted-foreground/40 size-10" />
                  <p className="text-foreground text-sm font-semibold">
                    Aucun créneau d&apos;entretien trouvé
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Modifiez vos filtres ou créez de nouveaux créneaux d&apos;entretien pour
                    alimenter le planning.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            slots.map((slot) => {
              const slotDate = new Date(slot.startsAt);
              const booking = slot.booking;
              const player = booking?.player;
              const isSelected = selectedSlotIds.includes(slot.id);
              const isUnbooked = !booking;
              const relativeBadge = getRelativeTimeBadge(slotDate);
              const isPast = slotDate < new Date();

              return (
                <TableRow
                  key={slot.id}
                  className={`transition-colors ${isSelected ? "bg-primary/5" : ""} ${
                    isPast ? "opacity-75" : ""
                  }`}
                >
                  {/* Case à cocher de sélection */}
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Sélectionner le créneau"
                      checked={isSelected}
                      disabled={!isUnbooked}
                      onChange={() => onToggleSelectSlot(slot.id)}
                      className="accent-primary size-4 cursor-pointer rounded disabled:opacity-30"
                    />
                  </TableCell>

                  {/* Horaire & Date */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {formatDate(slotDate, { style: "prefix-long", withTime: true })}
                        </span>
                        {relativeBadge && (
                          <Badge
                            variant={relativeBadge.variant}
                            className={`px-1.5 py-0 text-[10px] ${relativeBadge.className}`}
                          >
                            {relativeBadge.label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                        <Clock className="size-3" />
                        {formatDate(slotDate, { style: "time-only" })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Statut de disponibilité */}
                  <TableCell>
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
                  </TableCell>

                  {/* Joueur */}
                  <TableCell>
                    {booking && player ? (
                      <div className="flex items-center gap-2.5">
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
                            <Link
                              href={`/staff/atlas/${player.id}`}
                              className="text-foreground truncate text-xs font-semibold hover:underline"
                            >
                              {player.minecraftUsername ?? player.discordDisplayName}
                            </Link>
                            {player.characterSheet && (
                              <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
                                Fiche
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <span>@{player.discordUsername}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(player.discordUsername, "Tag Discord")}
                              className="text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                              title="Copier le tag Discord"
                            >
                              <Copy className="size-3" />
                            </button>
                            <Link
                              href={`/staff/atlas/${player.id}`}
                              className="text-muted-foreground/60 hover:text-foreground transition-colors"
                              title="Voir la fiche Atlas"
                            >
                              <ArrowSquareOut className="size-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">— Libre</span>
                    )}
                  </TableCell>

                  {/* Actions contextuelles */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <InterviewSlotRowActions slot={slot} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
