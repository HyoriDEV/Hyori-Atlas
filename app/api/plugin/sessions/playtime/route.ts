import { jsonError, jsonOk, requirePluginAuth } from "@/lib/api/plugin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Longest window the plugin may ask for (keeps the query bounded). */
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Playtime of every player inside a time window, from the recorded game sessions.
 * Only the part of each session that overlaps the window is counted.
 * Query: ?from=<ISO-8601>&to=<ISO-8601>
 * Response: { success, from, to, players: [{ minecraftUuid, minecraftUsername, seconds }] }
 * Used by the Minecraft plugin (village tax: players who played at least 1 h last RP weekend).
 */
export async function GET(request: Request) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  if (!from || !to) return jsonError("Paramètres from/to manquants ou invalides.", 400);
  if (to <= from) return jsonError("La fin de la période précède son début.", 400);
  if (to.getTime() - from.getTime() > MAX_WINDOW_MS) {
    return jsonError("Période trop longue (31 jours maximum).", 400);
  }

  const sessions = await prisma.gameSession.findMany({
    where: { connectedAt: { lt: to }, disconnectedAt: { gt: from } },
    select: {
      minecraftUuid: true,
      minecraftUsername: true,
      connectedAt: true,
      disconnectedAt: true,
    },
    orderBy: { connectedAt: "asc" },
  });

  const totals = new Map<string, { minecraftUsername: string; ms: number }>();
  for (const session of sessions) {
    const start = Math.max(session.connectedAt.getTime(), from.getTime());
    const end = Math.min(session.disconnectedAt.getTime(), to.getTime());
    if (end <= start) continue;
    const entry = totals.get(session.minecraftUuid) ?? {
      minecraftUsername: session.minecraftUsername,
      ms: 0,
    };
    entry.ms += end - start;
    entry.minecraftUsername = session.minecraftUsername; // latest known name
    totals.set(session.minecraftUuid, entry);
  }

  return jsonOk({
    from: from.toISOString(),
    to: to.toISOString(),
    players: [...totals.entries()].map(([minecraftUuid, entry]) => ({
      minecraftUuid,
      minecraftUsername: entry.minecraftUsername,
      seconds: Math.floor(entry.ms / 1000),
    })),
  });
}
