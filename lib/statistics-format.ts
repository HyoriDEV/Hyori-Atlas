export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return "—";
  }
  return `${Math.round(ratio * 100)} %`;
}

/** Pluriel français simple : « 1 ticket », « 3 tickets ». */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count > 1 ? plural : singular}`;
}
