"use client";

import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react";

import type { VariantProps } from "class-variance-authority";

import { Card } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MockSessionBlock } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";

export type AtlasLogActor =
  { type: "player" } | { type: "staff"; name: string; role?: string } | { type: "system" };

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
  reason?: string;
  metadata?: string;
}

function formatSessionDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  const hourStr = hours > 0 ? `${hours} heure${hours > 1 ? "s" : ""}` : "";
  const minStr = remainder > 0 ? `${remainder} minute${remainder > 1 ? "s" : ""}` : "";

  if (hours > 0 && remainder > 0) {
    return `${hourStr} et ${minStr}`;
  }
  if (hours > 0) {
    return hourStr;
  }
  return minStr || "0 minute";
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
              {actor.type === "staff" && <>par {actor.name}</>}
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
  sanctionHistory,
  sessionBlocks,
}: {
  logItems: AtlasLogItem[];
  sanctionHistory: AtlasSanctionHistoryItem[];
  sessionBlocks: MockSessionBlock[];
}) {
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
                  metadata={item.reason ? `Raison : ${item.reason}` : item.metadata}
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
            <div className="flex flex-col gap-5">
              {sessionBlocks.map((block, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatSessionDuration(block.dureeMinutes)}
                  </span>
                  <div className="flex flex-col">
                    <TimelineRow
                      title={formatDate(block.debut, { style: "prefix-short", withTime: true })}
                      isLast={false}
                    />
                    <TimelineRow
                      title={formatDate(block.fin, { style: "prefix-short", withTime: true })}
                      isLast
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
