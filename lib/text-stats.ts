export function countWords(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/** Durée lisible en français : « 12 min », « 3 h 20 », « 2 j 4 h ». */
export function formatDuration(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined || !Number.isFinite(milliseconds)) {
    return "—";
  }
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${totalHours} h ${String(minutes).padStart(2, "0")}` : `${totalHours} h`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
}
