"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  Broadcast,
  CaretDown,
  CaretRight,
  DownloadSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  SERVER_SOURCE,
  parseLog,
  type LogCategory,
  type LogEntry,
  type LogLevel,
} from "@/lib/log-parser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LogFileInfo = { name: string; size: number; modifiedAt: string };
type LogServerOption = { key: string; label: string };

const SERVER_STORAGE_KEY = "hyori-atlas:logs:server";

const LIVE_FILE = "latest.log";
const LIVE_INTERVAL_MS = 5000;
const PAGE_SIZE = 1500;
const ALL_SOURCES = "__all__";
const LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG"];

const levelLabels: Record<LogLevel, string> = {
  INFO: "Info",
  WARN: "Alerte",
  ERROR: "Erreur",
  DEBUG: "Debug",
};

const levelStyles: Record<LogLevel, string> = {
  INFO: "text-sky-600 dark:text-sky-400",
  WARN: "text-amber-600 dark:text-amber-400",
  ERROR: "text-destructive",
  DEBUG: "text-muted-foreground",
};

const levelRowStyles: Record<LogLevel, string> = {
  INFO: "",
  WARN: "bg-amber-500/5",
  ERROR: "bg-destructive/5",
  DEBUG: "opacity-70",
};

const categoryLabels: Record<"all" | LogCategory, string> = {
  all: "Tout",
  chat: "Chat",
  command: "Commandes",
  connection: "Connexions",
  other: "Système",
};

const sourcePalette = [
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-pink-600 dark:text-pink-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-orange-600 dark:text-orange-400",
  "text-lime-600 dark:text-lime-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-teal-600 dark:text-teal-400",
];

function sourceColor(source: string) {
  if (source === SERVER_SOURCE) return "text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return sourcePalette[Math.abs(hash) % sourcePalette.length];
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fileLabel(file: LogFileInfo) {
  if (file.name === LIVE_FILE) return "En cours (latest.log)";
  return `${file.name.replace(/\.log(\.gz)?$/, "")} · ${formatSize(file.size)}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let index = 0;
  let found = lower.indexOf(query, index);
  while (found !== -1) {
    if (found > index) parts.push(text.slice(index, found));
    parts.push(
      <mark key={found} className="bg-primary/25 text-foreground rounded-sm">
        {text.slice(found, found + query.length)}
      </mark>
    );
    index = found + query.length;
    found = lower.indexOf(query, index);
  }
  if (index < text.length) parts.push(text.slice(index));
  return <>{parts}</>;
}

function StatTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="gap-1 px-4 py-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("truncate text-xl font-semibold tabular-nums", className)}>{value}</span>
    </Card>
  );
}

export function LogViewer({ servers }: { servers: LogServerOption[] }) {
  const [server, setServer] = useState<string>(servers[0]?.key ?? "");
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [file, setFile] = useState<string>(LIVE_FILE);
  const [text, setText] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(["INFO", "WARN", "ERROR"]));
  const [category, setCategory] = useState<"all" | LogCategory>("all");
  const [source, setSource] = useState<string>(ALL_SOURCES);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SERVER_STORAGE_KEY);
      if (saved && servers.some((item) => item.key === saved)) setServer(saved);
    } catch {
      // stockage indisponible : on garde le premier serveur
    }
  }, [servers]);

  function selectServer(key: string) {
    setServer(key);
    setFile(LIVE_FILE);
    setSource(ALL_SOURCES);
    try {
      window.localStorage.setItem(SERVER_STORAGE_KEY, key);
    } catch {
      // ignoré
    }
  }

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff/logs?server=${encodeURIComponent(server)}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erreur");
      setFiles(json.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }, [server]);

  const loadFile = useCallback(async (name: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(
        `/api/staff/logs?server=${encodeURIComponent(server)}&file=${encodeURIComponent(name)}`,
        { cache: "no-store" }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erreur");
      setText(json.text);
      setTruncated(json.truncated);
      setFetchedAt(json.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [server]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    stickToBottom.current = true;
    setExpanded(new Set());
    setLimit(PAGE_SIZE);
    void loadFile(file);
  }, [file, loadFile]);

  const isLive = live && file === LIVE_FILE;

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadFile(LIVE_FILE, true);
    }, LIVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isLive, loadFile]);

  const entries = useMemo(() => parseLog(text), [text]);

  const stats = useMemo(() => {
    const byLevel: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
    const bySource = new Map<string, number>();
    for (const entry of entries) {
      byLevel[entry.level] += entry.count;
      bySource.set(entry.source, (bySource.get(entry.source) ?? 0) + entry.count);
    }
    const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
    const noisiest = sources.find(([name]) => name !== SERVER_SOURCE);
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return { byLevel, sources, noisiest, total };
  }, [entries]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (!levels.has(entry.level)) return false;
        if (category !== "all" && entry.category !== category) return false;
        if (source !== ALL_SOURCES && entry.source !== source) return false;
        if (normalizedQuery) {
          const haystack = `${entry.source} ${entry.message} ${entry.extra.join("\n")}`.toLowerCase();
          if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
      }),
    [entries, levels, category, source, normalizedQuery]
  );

  const visible = filtered.slice(Math.max(0, filtered.length - limit));
  const hiddenCount = filtered.length - visible.length;

  useEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [visible.length, text]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  function toggleLevel(level: LogLevel) {
    setLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function toggleExpanded(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadRaw() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${server}-${file.replace(/\.gz$/, "")}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const fileItems = (files.length ? files : [{ name: LIVE_FILE, size: 0, modifiedAt: "" }]).map(
    (item) => ({ value: item.name, label: fileLabel(item) })
  );
  const sourceItems = [
    { value: ALL_SOURCES, label: "Toutes les sources" },
    ...stats.sources.map(([name, count]) => ({ value: name, label: `${name} (${count})` })),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {servers.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {servers.map((item) => (
            <Button
              key={item.key}
              variant={item.key === server ? "default" : "outline"}
              onClick={() => selectServer(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Lignes" value={stats.total.toLocaleString("fr-FR")} />
        <StatTile
          label="Alertes"
          value={stats.byLevel.WARN.toLocaleString("fr-FR")}
          className={levelStyles.WARN}
        />
        <StatTile
          label="Erreurs"
          value={stats.byLevel.ERROR.toLocaleString("fr-FR")}
          className={levelStyles.ERROR}
        />
        <StatTile
          label="Plugin le plus bavard"
          value={stats.noisiest ? `${stats.noisiest[0]} · ${stats.noisiest[1]}` : "—"}
          className={stats.noisiest ? sourceColor(stats.noisiest[0]) : undefined}
        />
      </div>

      <Card className="gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={fileItems}
            value={file}
            onValueChange={(value) => value && setFile(value as string)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Fichier">
                {fileItems.find((item) => item.value === file)?.label ?? file}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {fileItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={sourceItems}
            value={source}
            onValueChange={(value) => setSource((value as string) ?? ALL_SOURCES)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Source">
                {source === ALL_SOURCES ? "Toutes les sources" : source}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sourceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-72">
            <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher (joueur, plugin, texte…)"
              className="pr-8 pl-8"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-0.5"
                title="Effacer la recherche"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {file === LIVE_FILE ? (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={live} onCheckedChange={(checked) => setLive(checked)} />
                <span className="flex items-center gap-1">
                  <Broadcast className={cn("size-4", isLive && "text-emerald-500 animate-pulse")} />
                  Live
                </span>
              </label>
            ) : null}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void loadFiles();
                void loadFile(file);
              }}
              title="Recharger"
            >
              <ArrowsClockwise className={cn(loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" onClick={downloadRaw} title="Télécharger" disabled={!text}>
              <DownloadSimple />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {LEVELS.map((level) => (
            <button key={level} type="button" onClick={() => toggleLevel(level)} className="cursor-pointer">
              <Badge
                variant={levels.has(level) ? "outline" : "secondary"}
                className={cn(levels.has(level) ? levelStyles[level] : "opacity-50 line-through")}
              >
                {levelLabels[level]} · {stats.byLevel[level]}
              </Badge>
            </button>
          ))}
          <span className="bg-border mx-1 hidden h-5 w-px sm:block" />
          {(Object.keys(categoryLabels) as ("all" | LogCategory)[]).map((key) => (
            <button key={key} type="button" onClick={() => setCategory(key)} className="cursor-pointer">
              <Badge variant={category === key ? "default" : "outline"}>{categoryLabels[key]}</Badge>
            </button>
          ))}
        </div>
      </Card>

      {error ? (
        <Card className="text-destructive p-4 text-sm">{error}</Card>
      ) : null}

      <Card className="gap-0 overflow-hidden p-0">
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs">
          <span>
            {filtered.length.toLocaleString("fr-FR")} entrées affichées
            {truncated ? " · fichier coupé (fin seulement)" : ""}
          </span>
          {fetchedAt ? (
            <span>Mis à jour {new Date(fetchedAt).toLocaleTimeString("fr-FR")}</span>
          ) : null}
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[65vh] overflow-auto font-mono text-xs leading-relaxed"
        >
          {hiddenCount > 0 ? (
            <div className="flex justify-center p-2">
              <Button variant="ghost" size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                Afficher {Math.min(PAGE_SIZE, hiddenCount)} entrées plus anciennes ({hiddenCount} masquées)
              </Button>
            </div>
          ) : null}
          {!loading && visible.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center font-sans text-sm">
              Aucune entrée pour ces filtres.
            </div>
          ) : null}
          {visible.map((entry) => (
            <LogRow
              key={entry.id}
              entry={entry}
              query={normalizedQuery}
              expanded={expanded.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
              onSource={() => setSource(entry.source)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function LogRow({
  entry,
  query,
  expanded,
  onToggle,
  onSource,
}: {
  entry: LogEntry;
  query: string;
  expanded: boolean;
  onToggle: () => void;
  onSource: () => void;
}) {
  const hasExtra = entry.extra.length > 0;
  return (
    <div className={cn("hover:bg-muted/50 border-b border-border/40 px-3 py-0.5", levelRowStyles[entry.level])}>
      <div className="flex min-w-0 items-start gap-2">
        <span className="text-muted-foreground shrink-0 tabular-nums">{entry.time}</span>
        <span className={cn("w-12 shrink-0 font-semibold", levelStyles[entry.level])}>
          {entry.level}
        </span>
        <button
          type="button"
          onClick={onSource}
          title="Filtrer sur cette source"
          className={cn(
            "hidden max-w-36 shrink-0 cursor-pointer truncate text-left font-semibold hover:underline sm:block",
            sourceColor(entry.source)
          )}
        >
          {entry.source}
        </button>
        <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
          <span className={cn("font-semibold sm:hidden", sourceColor(entry.source))}>
            {entry.source}{" "}
          </span>
          <Highlight text={entry.message} query={query} />
        </span>
        {entry.count > 1 ? (
          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-xs">
            ×{entry.count}
          </Badge>
        ) : null}
        {hasExtra ? (
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-0.5"
            title={expanded ? "Replier" : "Déplier"}
          >
            {expanded ? <CaretDown className="size-3.5" /> : <CaretRight className="size-3.5" />}
            {entry.extra.length}
          </button>
        ) : null}
      </div>
      {hasExtra && expanded ? (
        <pre className="text-muted-foreground mt-1 mb-1 ml-4 overflow-x-auto border-l-2 border-current/30 pl-3 whitespace-pre">
          <Highlight text={entry.extra.join("\n")} query={query} />
        </pre>
      ) : null}
    </div>
  );
}
