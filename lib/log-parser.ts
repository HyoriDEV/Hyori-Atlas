// Découpe un log Paper/Purpur en entrées lisibles (niveau, plugin, catégorie),
// rattache les stack traces à leur ligne et regroupe les doublons consécutifs.

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
export type LogCategory = "chat" | "command" | "connection" | "other";

export type LogEntry = {
  id: number;
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

export function parseLog(text: string): LogEntry[] {
  const entries: LogEntry[] = [];
  let nextId = 0;

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
