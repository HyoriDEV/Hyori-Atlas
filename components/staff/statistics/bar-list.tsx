import { ChartEmptyState } from "@/components/staff/statistics/chart-card";
import { formatNumber, formatPercent } from "@/lib/statistics-format";

export interface BarListItem {
  label: string;
  value: number;
}

/**
 * Barres horizontales à une seule série : chaque valeur est écrite en clair au bout de sa
 * barre, la lecture ne dépend donc ni de la couleur ni d'une infobulle.
 */
export function BarList({
  items,
  max,
  decimals = 0,
  valueSuffix = "",
  showShare = false,
  emptyLabel,
}: {
  items: BarListItem[];
  /** Valeur pleine échelle ; par défaut la plus grande valeur de la liste. */
  max?: number;
  decimals?: number;
  valueSuffix?: string;
  /** Affiche la part de chaque valeur dans le total de la liste. */
  showShare?: boolean;
  emptyLabel?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (items.length === 0 || total === 0) {
    return <ChartEmptyState>{emptyLabel}</ChartEmptyState>;
  }

  const scaleMax = max ?? Math.max(...items.map((item) => item.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm"
        >
          <span className="text-foreground/90 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="bg-muted/40 h-2.5 rounded-r-sm">
            <div
              className="bg-chart-1 h-full rounded-r-sm"
              style={{
                width: `${scaleMax > 0 ? Math.min(100, (item.value / scaleMax) * 100) : 0}%`,
              }}
            />
          </div>
          <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
            <span className="text-foreground font-medium">
              {formatNumber(item.value, decimals)}
              {valueSuffix}
            </span>
            {showShare ? ` · ${formatPercent(item.value / total)}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
