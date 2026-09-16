export const CLASS_PALETTE = [
  { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30", fill: "#f59e0b" },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    fill: "#10b981",
  },
  { bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500/30", fill: "#0ea5e9" },
  { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30", fill: "#8b5cf6" },
  { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30", fill: "#f43f5e" },
  { bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/30", fill: "#6366f1" },
  { bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-500/30", fill: "#14b8a6" },
  { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", fill: "#f97316" },
  { bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500/30", fill: "#06b6d4" },
  {
    bg: "bg-fuchsia-500",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500/30",
    fill: "#d946ef",
  },
];

export function getClassPaletteColor(index: number) {
  return CLASS_PALETTE[index % CLASS_PALETTE.length];
}

export const NEUTRAL_PALETTE_COLOR = {
  bg: "bg-muted-foreground/40",
  text: "text-muted-foreground",
  border: "border-muted-foreground/20",
  fill: "#94a3b8",
};
