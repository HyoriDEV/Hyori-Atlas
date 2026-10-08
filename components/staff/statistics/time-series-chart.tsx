"use client";

import { useState } from "react";
import { ChartBar, Table as TableIcon } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartEmptyState } from "@/components/staff/statistics/chart-card";

export interface ChartSeries {
  key: string;
  label: string;
  /** Couleur CSS de la série, ex. `var(--chart-1)`. Elle suit la série, jamais son rang. */
  color: string;
}

export type ChartRow = { label: string } & Record<string, string | number>;

const SURFACE_GAP_PX = 2;

export function TimeSeriesChart({
  data,
  series,
  kind = "bar",
  stacked = false,
  allowDecimals = false,
  bucketLabel = "Période",
}: {
  data: ChartRow[];
  series: ChartSeries[];
  kind?: "bar" | "line";
  stacked?: boolean;
  allowDecimals?: boolean;
  /** Intitulé de la première colonne de la vue tableau. */
  bucketLabel?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const isEmpty = data.every((row) => series.every((entry) => !Number(row[entry.key])));
  if (isEmpty) {
    return <ChartEmptyState />;
  }

  const config: ChartConfig = Object.fromEntries(
    series.map((entry) => [entry.key, { label: entry.label, color: entry.color }])
  );
  const hasLegend = series.length > 1;

  // Sur de petits effectifs entiers, cinq graduations étireraient l'axe bien au-delà des données.
  const maxValue = Math.max(
    ...data.map((row) => {
      const values = series.map((entry) => Number(row[entry.key]) || 0);
      return stacked ? values.reduce((sum, value) => sum + value, 0) : Math.max(...values);
    })
  );
  const tickCount = allowDecimals ? 5 : Math.min(5, Math.max(2, Math.ceil(maxValue) + 1));

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={20} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={4}
        width={40}
        allowDecimals={allowDecimals}
        tickCount={tickCount}
        niceTicks="snap125"
      />
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-7 items-center justify-between gap-3">
        {hasLegend ? (
          <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {series.map((entry) => (
              <li key={entry.key} className="flex items-center gap-1.5">
                <span
                  className={kind === "line" ? "h-0.5 w-3 rounded-full" : "size-2 rounded-[2px]"}
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                {entry.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          aria-pressed={view === "table"}
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          title={view === "chart" ? "Afficher les données en tableau" : "Afficher le graphique"}
          aria-label={
            view === "chart" ? "Afficher les données en tableau" : "Afficher le graphique"
          }
        >
          {view === "chart" ? <TableIcon /> : <ChartBar />}
        </Button>
      </div>

      {view === "table" ? (
        <div className="border-border/60 max-h-64 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{bucketLabel}</TableHead>
                {series.map((entry) => (
                  <TableHead key={entry.key} className="text-right">
                    {entry.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-muted-foreground">{row.label}</TableCell>
                  {series.map((entry) => (
                    <TableCell key={entry.key} className="text-right tabular-nums">
                      {Number(row[entry.key]).toLocaleString("fr-FR")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-60 w-full">
          {kind === "line" ? (
            <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 0 }}>
              {axes}
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {series.map((entry) => (
                <Line
                  key={entry.key}
                  dataKey={entry.key}
                  type="linear"
                  stroke={`var(--color-${entry.key})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 0 }}>
              {axes}
              <ChartTooltip cursor={{ opacity: 0.35 }} content={<ChartTooltipContent />} />
              {series.map((entry, index) => {
                const isStackTop = !stacked || index === series.length - 1;
                return (
                  <Bar
                    key={entry.key}
                    dataKey={entry.key}
                    stackId={stacked ? "stack" : undefined}
                    fill={`var(--color-${entry.key})`}
                    maxBarSize={24}
                    radius={isStackTop ? [4, 4, 0, 0] : 0}
                    stroke="var(--card)"
                    strokeWidth={stacked ? SURFACE_GAP_PX : 0}
                    isAnimationActive={false}
                  />
                );
              })}
            </BarChart>
          )}
        </ChartContainer>
      )}
    </div>
  );
}
