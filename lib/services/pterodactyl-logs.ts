import "server-only";
import { constants, gunzipSync } from "node:zlib";

// Lecture des logs du serveur Minecraft via l'API client Pterodactyl.
// Clé client en lecture seule (FILE read + read-content), ex. compte hyori_backup.

export type LogFileInfo = {
  name: string;
  size: number;
  modifiedAt: string;
};

const LOGS_DIR = "/logs";
const FILE_NAME_PATTERN = /^[\w.-]+\.log(\.gz)?$/;
// On ne renvoie que la fin des gros fichiers pour garder la page fluide.
const MAX_BYTES = 4 * 1024 * 1024;

export type LogServer = { key: string; label: string; id: string };

// Serveurs par défaut (ids non secrets). Surcharge possible : PTERO_SERVERS="prod:uuid,build:uuid".
const DEFAULT_SERVERS = "prod:c244534d-784f-4727-ac88-03460643e7b0,build:d6ac9900-fd12-4d55-b3e0-4ba236d5b060,auth:336a38a4-c718-46a6-bd44-44c1d12bc400";
const DEFAULT_URL = "https://admin.hyori-rp.fr";

const serverLabels: Record<string, string> = { prod: "Prod", build: "Build", auth: "Auth" };

export function getLogServers(): LogServer[] {
  return (process.env.PTERO_SERVERS || DEFAULT_SERVERS)
    .split(",")
    .map((pair) => pair.trim().split(":"))
    .filter(([key, id]) => key && id)
    .map(([key, id]) => ({ key, id, label: serverLabels[key] ?? key }));
}

function getConfig() {
  const url = (process.env.PTERO_URL || DEFAULT_URL).replace(/\/+$/, "");
  const apiKey = process.env.PTERO_API_KEY;
  if (!apiKey) {
    return null;
  }
  return { url, apiKey };
}

export function isPterodactylConfigured() {
  return getConfig() !== null && getLogServers().length > 0;
}

export function isValidLogFileName(name: string) {
  return FILE_NAME_PATTERN.test(name) && !name.includes("..");
}

function resolveServerId(serverKey: string) {
  const server = getLogServers().find((item) => item.key === serverKey);
  if (!server) {
    throw new Error("Serveur inconnu");
  }
  return server.id;
}

async function pteroFetch(serverKey: string, path: string) {
  const config = getConfig();
  if (!config) {
    throw new Error("Pterodactyl non configuré (PTERO_API_KEY)");
  }
  const serverId = resolveServerId(serverKey);
  const response = await fetch(`${config.url}/api/client/servers/${serverId}${path}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Pterodactyl ${response.status} sur ${path}`);
  }
  return response;
}

export async function listLogFiles(serverKey: string): Promise<LogFileInfo[]> {
  const response = await pteroFetch(serverKey, `/files/list?directory=${encodeURIComponent(LOGS_DIR)}`);
  const json = (await response.json()) as {
    data: { attributes: { name: string; size: number; is_file: boolean; modified_at: string } }[];
  };
  return json.data
    .map((entry) => entry.attributes)
    .filter((file) => file.is_file && isValidLogFileName(file.name))
    .map((file) => ({ name: file.name, size: file.size, modifiedAt: file.modified_at }))
    .sort((a, b) => {
      if (a.name === "latest.log") return -1;
      if (b.name === "latest.log") return 1;
      return b.modifiedAt.localeCompare(a.modifiedAt);
    });
}

function keepTail(text: string) {
  if (text.length <= MAX_BYTES) {
    return { text, truncated: false };
  }
  const cut = text.slice(text.length - MAX_BYTES);
  const firstNewline = cut.indexOf("\n");
  return { text: firstNewline >= 0 ? cut.slice(firstNewline + 1) : cut, truncated: true };
}

export async function readLogFile(
  serverKey: string,
  name: string
): Promise<{ text: string; truncated: boolean }> {
  if (!isValidLogFileName(name)) {
    throw new Error("Nom de fichier invalide");
  }
  const filePath = `${LOGS_DIR}/${name}`;

  if (!name.endsWith(".gz")) {
    const response = await pteroFetch(serverKey, `/files/contents?file=${encodeURIComponent(filePath)}`);
    return keepTail(await response.text());
  }

  // Archives : lien de téléchargement signé (Wings, usage unique), puis décompression ici.
  // Wings renvoie parfois un 500 passager : on redemande un lien neuf jusqu'à 3 fois.
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    const response = await pteroFetch(serverKey, `/files/download?file=${encodeURIComponent(filePath)}`);
    const json = (await response.json()) as { attributes: { url: string } };
    const download = await fetch(json.attributes.url, { cache: "no-store" });
    if (!download.ok) {
      lastStatus = download.status;
      continue;
    }
    const buffer = Buffer.from(await download.arrayBuffer());
    // finishFlush : accepte une archive coupée (serveur arrêté pendant la compression).
    const text = gunzipSync(buffer, { finishFlush: constants.Z_SYNC_FLUSH }).toString("utf8");
    return keepTail(text);
  }
  throw new Error(`Téléchargement ${lastStatus} pour ${name}`);
}
