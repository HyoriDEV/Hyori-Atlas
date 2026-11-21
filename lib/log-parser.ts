// Découpe un log Paper/Purpur en entrées lisibles (niveau, plugin, catégorie),
// rattache les stack traces à leur ligne et regroupe les doublons consécutifs.

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
export type LogCategory = "chat" | "command" | "connection" | "other";

export type LogEntry = {
  id: number;
  // Jour du fichier (AAAA-MM-JJ), vide si inconnu.
  date: string;
  time: string;
  level: LogLevel;
  thread: string | null;
  source: string;
  message: string;
  extra: string[];
  category: LogCategory;
  count: number;
};

export const SERVER_SOURCE = "Serveur";

const ANSI_PATTERN = /\x1b\[[0-9;?]*[A-Za-z]/g;
const MC_COLOR_PATTERN = /§[0-9a-fk-orx]/gi;
const HEADER_PATTERN =
  /^\[(\d{2}:\d{2}:\d{2})(?:\s+(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|FATAL|TRACE))?\]\s*(?:\[([^\]]*?)\/(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|FATAL|TRACE)\])?:?\s?(.*)$/;
const SOURCE_PATTERN = /^\[([A-Za-z0-9_.\- ]{1,40})\]:?\s?(.*)$/;
const CHAT_PATTERN = /^(?:\[Not Secure\]\s*)?<[^>]{1,40}>\s/;
const COMMAND_PATTERN = / issued server command: /;
const CONNECTION_PATTERN =
  /( joined the game| left the game| logged in with entity id| lost connection: |^UUID of player |^Disconnecting )/;

function normalizeLevel(raw: string | undefined): LogLevel {
  switch (raw) {
    case "WARN":
    case "WARNING":
      return "WARN";
    case "ERROR":
    case "SEVERE":
    case "FATAL":
      return "ERROR";
    case "DEBUG":
    case "TRACE":
      return "DEBUG";
    default:
      return "INFO";
  }
}

function categorize(message: string): LogCategory {
  if (CHAT_PATTERN.test(message)) return "chat";
  if (COMMAND_PATTERN.test(message)) return "command";
  if (CONNECTION_PATTERN.test(message)) return "connection";
  return "other";
}

export function cleanLogLine(line: string) {
  return line.replace(ANSI_PATTERN, "").replace(MC_COLOR_PATTERN, "").replace(/\r$/, "");
}

export function parseLog(text: string, date = "", firstId = 0): LogEntry[] {
  const entries: LogEntry[] = [];
  let nextId = firstId;

  for (const rawLine of text.split("\n")) {
    const line = cleanLogLine(rawLine);
    if (!line.trim()) continue;

    const header = HEADER_PATTERN.exec(line);
    if (!header) {
      // Suite d'une entrée (stack trace, message multi-ligne).
      const last = entries[entries.length - 1];
      if (last) {
        last.extra.push(line);
      } else {
        entries.push({
          id: nextId++,
          date,
          time: "",
          level: "INFO",
          thread: null,
          source: SERVER_SOURCE,
          message: line,
          extra: [],
          category: "other",
          count: 1,
        });
      }
      continue;
    }

    const [, time, levelA, thread, levelB, body] = header;
    const level = normalizeLevel(levelA ?? levelB);
    let message = body;
    let source = SERVER_SOURCE;

    const sourceMatch = SOURCE_PATTERN.exec(message);
    if (sourceMatch && sourceMatch[1] !== "Not Secure") {
      source = sourceMatch[1].trim();
      message = sourceMatch[2];
    }

    const category = categorize(message);
    const last = entries[entries.length - 1];
    if (
      last &&
      last.extra.length === 0 &&
      last.level === level &&
      last.source === source &&
      last.message === message
    ) {
      last.count += 1;
      last.time = time;
      continue;
    }

    entries.push({
      id: nextId++,
      date,
      time,
      level,
      thread: thread ?? null,
      source,
      message,
      extra: [],
      category,
      count: 1,
    });
  }

  return entries;
}

// --- Présence des joueurs (connexions / déconnexions) ---

// Moment = "AAAA-MM-JJ hh:mm:ss" (ou "hh:mm:ss" sans date), comparable en texte.
export function entryMoment(entry: Pick<LogEntry, "date" | "time">) {
  return entry.date ? `${entry.date} ${entry.time}` : entry.time;
}

export type PresenceEvent = {
  time: string;
  type: "join" | "leave" | "reset";
  name: string;
};

export type OnlinePlayer = { name: string; since: string };

const JOIN_PATTERN = /^([A-Za-z0-9_]{2,16})(?:\[[^\]]*\])? (?:logged in with entity id|joined the game)/;
const LEAVE_PATTERN = /^([A-Za-z0-9_]{2,16}) (?:lost connection:|left the game)/;
const RESET_PATTERN = /^(Stopping server|Starting minecraft server|Done \()/;

export function extractPresence(entries: LogEntry[]): PresenceEvent[] {
  const events: PresenceEvent[] = [];
  for (const entry of entries) {
    if (!entry.time) continue;
    if (entry.source === SERVER_SOURCE && RESET_PATTERN.test(entry.message)) {
      events.push({ time: entryMoment(entry), type: "reset", name: "" });
      continue;
    }
    const join = JOIN_PATTERN.exec(entry.message);
    if (join) {
      events.push({ time: entryMoment(entry), type: "join", name: join[1] });
      continue;
    }
    const leave = LEAVE_PATTERN.exec(entry.message);
    if (leave) {
      events.push({ time: entryMoment(entry), type: "leave", name: leave[1] });
    }
  }
  return events;
}

// Joueurs connectés au moment donné (format entryMoment), en rejouant les événements.
export function onlineAt(events: PresenceEvent[], time: string): OnlinePlayer[] {
  const online = new Map<string, string>();
  for (const event of events) {
    if (event.time > time) break;
    if (event.type === "reset") online.clear();
    else if (event.type === "join") {
      if (!online.has(event.name)) online.set(event.name, event.time);
    } else online.delete(event.name);
  }
  return [...online.entries()]
    .map(([name, since]) => ({ name, since }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Pic de joueurs connectés et son heure.
export function peakOnline(events: PresenceEvent[]): { count: number; time: string } {
  const online = new Set<string>();
  let peak = { count: 0, time: "" };
  for (const event of events) {
    if (event.type === "reset") online.clear();
    else if (event.type === "join") online.add(event.name);
    else online.delete(event.name);
    if (online.size > peak.count) peak = { count: online.size, time: event.time };
  }
  return peak;
}
