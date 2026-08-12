"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MockSessionBlock } from "@/lib/mock-server-data";
import { formatDate } from "@/lib/date";

export interface AtlasActionHistoryItem {
  date: Date;
  text: string;
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

function TimelineRow({ date, text, isLast }: { date?: string; text: string; isLast: boolean }) {
  return (
    <div className="relative flex flex-row gap-3 pb-5 last:pb-0">
      {!isLast && <span className="bg-border absolute top-2.5 left-[3px] h-full w-px" />}
      <span className="bg-primary relative z-10 mt-1.5 size-1.5 shrink-0 rounded-full" />
      <div className="flex flex-col">
        {date && <span className="text-muted-foreground text-xs">{date}</span>}
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

export function AtlasTimelineTabs({
  actionHistory,
  sessionBlocks,
}: {
  actionHistory: AtlasActionHistoryItem[];
  sessionBlocks: MockSessionBlock[];
}) {
  return (
    <Card className="flex flex-col gap-4">
      <Tabs defaultValue="actions">
        <TabsList variant="line">
          <TabsTrigger value="actions">Historique d&apos;actions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions de jeu</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="pt-4">
          {actionHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune activité enregistrée.</p>
          ) : (
            <div className="flex flex-col">
              {actionHistory.map((item, index) => (
                <TimelineRow
                  key={`${item.date.toISOString()}-${index}`}
                  date={formatDate(item.date, { style: "prefix-long", withTime: true })}
                  text={item.text}
                  isLast={index === actionHistory.length - 1}
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
                      date={formatDate(block.debut, { style: "prefix-short", withTime: true })}
                      text="Début"
                      isLast={false}
                    />
                    <TimelineRow
                      date={formatDate(block.fin, { style: "prefix-short", withTime: true })}
                      text="Fin"
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
