import { Fragment } from "react";

import { formatNumber } from "@/lib/statistics-format";
import { ChartEmptyState } from "@/components/staff/statistics/chart-card";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// Échelle séquentielle à une seule teinte : plus le créneau est fréquenté, plus il est lumineux.
const INTENSITY_STEPS = [
  "var(--muted)",
  "color-mix(in oklab, var(--chart-1) 22%, var(--card))",
  "color-mix(in oklab, var(--chart-1) 42%, var(--card))",
  "color-mix(in oklab, var(--chart-1) 62%, var(--card))",
  "color-mix(in oklab, var(--chart-1) 82%, var(--card))",
  "var(--chart-1)",
];

function intensityStep(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(
    INTENSITY_STEPS.length - 1,
    Math.ceil((value / max) * (INTENSITY_STEPS.length - 1))
  );
}

/** `values[jour][heure]` : joueurs connectés en moyenne, lundi en premier, heure de Paris. */
export function ActivityHeatmap({ values }: { values: number[][] }) {
  let max = 0;
  let peak = { weekday: 0, hour: 0 };
  values.forEach((hoursOfDay, weekday) =>
    hoursOfDay.forEach((value, hour) => {
      if (value > max) {
        max = value;
        peak = { weekday, hour };
      }
    })
  );

  if (max === 0) {
    return <ChartEmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[34rem] items-center gap-[2px] text-xs"
          style={{ gridTemplateColumns: "2.75rem repeat(24, minmax(0, 1fr))" }}
          role="img"
          aria-label={`Fréquentation moyenne par jour et par heure. Créneau le plus fréquenté : ${WEEKDAYS[peak.weekday]} à ${peak.hour} h.`}
        >
          <span />
          {HOURS.map((hour) => (
            <span key={hour} className="text-muted-foreground text-center text-[10px]">
              {hour % 3 === 0 ? `${hour} h` : ""}
            </span>
          ))}
          {WEEKDAYS.map((weekday, weekdayIndex) => (
            <Fragment key={weekday}>
              <span className="text-muted-foreground pr-1.5">{weekday.slice(0, 3)}.</span>
              {HOURS.map((hour) => {
                const value = values[weekdayIndex]?.[hour] ?? 0;
                return (
                  <span
                    key={hour}
                    className="hover:ring-foreground/60 h-5 rounded-[3px] hover:ring-1"
                    style={{ backgroundColor: INTENSITY_STEPS[intensityStep(value, max)] }}
                    title={`${weekday}, ${hour} h – ${hour + 1} h : ${formatNumber(value, 1)} joueur(s) en moyenne`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <span>
          Créneau le plus fréquenté :{" "}
          <span className="text-foreground font-medium">
            {WEEKDAYS[peak.weekday].toLowerCase()} de {peak.hour} h à {peak.hour + 1} h
          </span>{" "}
          ({formatNumber(max, 1)} joueur(s) en moyenne)
        </span>
        <span className="flex items-center gap-1.5">
          0
          <span className="flex gap-[2px]" aria-hidden="true">
            {INTENSITY_STEPS.map((color) => (
              <span
                key={color}
                className="size-3 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
          {formatNumber(max, 1)}
        </span>
      </div>
    </div>
  );
}
