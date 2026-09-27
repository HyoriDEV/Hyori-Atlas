"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fr } from "date-fns/locale";
import { ArrowSquareOut, CalendarBlank, X } from "@phosphor-icons/react";

import type { VariantProps } from "class-variance-authority";

import { Card } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatShortTime } from "@/lib/date";

export interface AtlasSessionBlock {
  id?: string;
  debut: Date;
  fin: Date;
  dureeMinutes: number;
  minecraftUsername?: string;
  ipAddress?: string;
  metadata?: string;
}

export type AtlasLogActor =
  | { type: "player" }
  | { type: "staff"; id?: string; name: string; role?: string }
  | { type: "system" };

export type AtlasLogBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface AtlasLogBadge {
  label: string;
  variant?: AtlasLogBadgeVariant;
}

export interface AtlasLogLink {
  href: string;
  label: string;
  targetBlank?: boolean;
}

export interface AtlasLogItem {
  id?: string;
  date: Date;
  title: string;
  actor?: AtlasLogActor;
  badge?: AtlasLogBadge;
  link?: AtlasLogLink;
  metadata?: string;
}

export interface AtlasSanctionHistoryItem {
  id?: string;
  date: Date;
  title: string;
  actor?: AtlasLogActor;
  badge?: AtlasLogBadge;
  reason?: string;
  metadata?: string;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPlaytime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function formatSessionInlineDate(debutInput: Date | string, finInput: Date | string): string {
  const debut = debutInput instanceof Date ? debutInput : new Date(debutInput);
  const fin = finInput instanceof Date ? finInput : new Date(finInput);

  if (isSameDay(debut, fin)) {
    const dateStr = formatDate(debut, { style: "prefix-short", withTime: false, withYear: true });
    const timeStart = formatShortTime(debut);
    const timeEnd = formatShortTime(fin);
    return `${dateStr} · ${timeStart} à ${timeEnd}`;
  }

  const startStr = formatDate(debut, { style: "prefix-short", withTime: true, withYear: true });
  const endStr = formatDate(fin, { style: "prefix-short", withTime: true, withYear: true });
  return `${startStr} à ${endStr}`;
}

function TimelineRow({
  date,
  title,
  actor,
  badge,
  link,
  metadata,
  isLast,
}: {
  date?: string;
  title: string;
  actor?: AtlasLogActor;
  badge?: AtlasLogBadge;
  link?: AtlasLogLink;
  metadata?: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex flex-row gap-3 pb-5 last:pb-0">
      {!isLast && <span className="bg-border absolute top-2.5 left-[3px] h-full w-px" />}
      <span className="bg-primary relative z-10 mt-1.5 size-1.5 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1">
        {date && <span className="text-muted-foreground text-xs">{date}</span>}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-foreground font-medium">{title}</span>
          {badge && (
            <Badge
              variant={badge.variant ?? "secondary"}
              className="h-4 px-1.5 py-0 text-[11px] font-normal"
            >
              {badge.label}
            </Badge>
          )}
          {actor && (
            <span className="text-muted-foreground text-xs font-normal">
              {actor.type === "staff" && (
                <>
                  par{" "}
                  {actor.id ? (
                    <Link
                      href={`/staff/atlas/${actor.id}`}
                      className="hover:text-foreground font-medium hover:underline"
                      title={`Voir la fiche Atlas de ${actor.name}`}
                    >
                      {actor.name}
                    </Link>
                  ) : (
                    actor.name
                  )}
                </>
              )}
              {actor.type === "player" && <>(joueur)</>}
              {actor.type === "system" && <>(automatique)</>}
            </span>
          )}
          {link && (
            <Link
              href={link.href}
              target={link.targetBlank ? "_blank" : undefined}
              rel={link.targetBlank ? "noopener noreferrer" : undefined}
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <span>{link.label}</span>
              {link.targetBlank && <ArrowSquareOut className="size-3.5" />}
            </Link>
          )}
        </div>
        {metadata && <span className="text-muted-foreground text-xs">{metadata}</span>}
      </div>
    </div>
  );
}

export function AtlasTimelineTabs({
  logItems,
  sanctionHistory = [],
  sessionBlocks = [],
}: {
  logItems: AtlasLogItem[];
  sanctionHistory?: AtlasSanctionHistoryItem[];
  sessionBlocks?: AtlasSessionBlock[];
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const daysWithSessions = useMemo(() => {
    return sessionBlocks.flatMap((s) => [
      s.debut instanceof Date ? s.debut : new Date(s.debut),
      s.fin instanceof Date ? s.fin : new Date(s.fin),
    ]);
  }, [sessionBlocks]);

  const filteredSessions = useMemo(() => {
    if (!selectedDate) return sessionBlocks;
    return sessionBlocks.filter((block) => {
      const debut = block.debut instanceof Date ? block.debut : new Date(block.debut);
      const fin = block.fin instanceof Date ? block.fin : new Date(block.fin);
      return isSameDay(debut, selectedDate) || isSameDay(fin, selectedDate);
    });
  }, [sessionBlocks, selectedDate]);

  const totalFilteredMinutes = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + s.dureeMinutes, 0);
  }, [filteredSessions]);

  return (
    <Card className="flex flex-col gap-4">
      <Tabs defaultValue="actions">
        <TabsList variant="line">
          <TabsTrigger value="actions">Logs</TabsTrigger>
          <TabsTrigger value="sanctions">Sanctions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions de jeu</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="pt-4">
          {logItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune activité enregistrée.</p>
          ) : (
            <div className="flex flex-col">
              {logItems.map((item, index) => (
                <TimelineRow
                  key={item.id ?? `${item.date.toISOString()}-${index}`}
                  date={formatDate(item.date, { style: "prefix-long", withTime: true })}
                  title={item.title}
                  actor={item.actor}
                  badge={item.badge}
                  link={item.link}
                  metadata={item.metadata}
                  isLast={index === logItems.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sanctions" className="pt-4">
          {sanctionHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune sanction enregistrée.</p>
          ) : (
            <div className="flex flex-col">
              {sanctionHistory.map((item, index) => (
                <TimelineRow
                  key={item.id ?? `${item.date.toISOString()}-${index}`}
                  date={formatDate(item.date, { style: "prefix-long", withTime: true })}
                  title={item.title}
                  actor={item.actor}
                  badge={item.badge}
                  metadata={
                    [item.reason ? `Raison : ${item.reason}` : null, item.metadata]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  isLast={index === sanctionHistory.length - 1}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          {sessionBlocks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune session enregistrée.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant={selectedDate ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 gap-2 text-xs"
                        />
                      }
                    >
                      <CalendarBlank className="size-3.5" />
                      {selectedDate
                        ? formatDate(selectedDate, {
                            style: "prefix-long",
                            withTime: false,
                            withYear: true,
                          })
                        : "Filtrer par date"}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }}
                        locale={fr}
                        modifiers={{
                          hasSessions: (date) => daysWithSessions.some((d) => isSameDay(d, date)),
                        }}
                        modifiersClassNames={{
                          hasSessions:
                            "font-bold text-primary underline underline-offset-4 decoration-primary/60",
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="text-muted-foreground hover:text-foreground h-8 gap-1 px-2 text-xs"
                    >
                      <X className="size-3.5" />
                      Effacer le filtre
                    </Button>
                  )}
                </div>

                <span className="text-muted-foreground text-xs">
                  {selectedDate
                    ? `${filteredSessions.length} session${filteredSessions.length > 1 ? "s" : ""} trouvée${filteredSessions.length > 1 ? "s" : ""} (${formatPlaytime(totalFilteredMinutes)})`
                    : `${sessionBlocks.length} session${sessionBlocks.length > 1 ? "s" : ""}`}
                </span>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-6 text-center text-xs">
                  <p>
                    Aucune session enregistrée pour le{" "}
                    {formatDate(selectedDate, {
                      style: "prefix-long",
                      withTime: false,
                      withYear: true,
                    })}
                    .
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="h-7 text-xs"
                  >
                    Voir toutes les sessions
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredSessions.map((block, index) => (
                    <div
                      key={block.id ?? index}
                      className="relative flex flex-row items-start gap-3 pb-3.5 last:pb-0"
                    >
                      {index < filteredSessions.length - 1 && (
                        <span className="bg-border absolute top-2.5 left-[3px] h-full w-px" />
                      )}
                      <span className="bg-primary relative z-10 mt-1.5 size-1.5 shrink-0 rounded-full" />
                      <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-medium">
                            {formatSessionInlineDate(block.debut, block.fin)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 py-0 text-[11px] font-normal"
                          >
                            {formatPlaytime(block.dureeMinutes)}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          {block.minecraftUsername && (
                            <span className="text-foreground/80 font-medium">
                              {block.minecraftUsername}
                            </span>
                          )}
                          {block.minecraftUsername && (block.ipAddress || block.metadata) && (
                            <span>·</span>
                          )}
                          {block.ipAddress ? (
                            <span className="font-mono">IP {block.ipAddress}</span>
                          ) : (
                            block.metadata && <span>{block.metadata}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
