import "server-only";
import { gunzipSync } from "node:zlib";

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

function getConfig() {
  const url = process.env.PTERO_URL?.replace(/\/+$/, "");
  const serverId = process.env.PTERO_SERVER_ID;
  const apiKey = process.env.PTERO_API_KEY;
  if (!url || !serverId || !apiKey) {
    return null;
  }
  return { url, serverId, apiKey };
}

export function isPterodactylConfigured() {
  return getConfig() !== null;
}

export function isValidLogFileName(name: string) {
  return FILE_NAME_PATTERN.test(name) && !name.includes("..");
}

async function pteroFetch(path: string) {
  const config = getConfig();
  if (!config) {
    throw new Error("Pterodactyl non configuré (PTERO_URL, PTERO_SERVER_ID, PTERO_API_KEY)");
  }
  const response = await fetch(`${config.url}/api/client/servers/${config.serverId}${path}`, {
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

export async function listLogFiles(): Promise<LogFileInfo[]> {
  const response = await pteroFetch(`/files/list?directory=${encodeURIComponent(LOGS_DIR)}`);
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

export async function readLogFile(name: string): Promise<{ text: string; truncated: boolean }> {
  if (!isValidLogFileName(name)) {
    throw new Error("Nom de fichier invalide");
  }
  const filePath = `${LOGS_DIR}/${name}`;

  if (!name.endsWith(".gz")) {
    const response = await pteroFetch(`/files/contents?file=${encodeURIComponent(filePath)}`);
    return keepTail(await response.text());
  }

  // Archives : lien de téléchargement signé (Wings), puis décompression ici.
  const response = await pteroFetch(`/files/download?file=${encodeURIComponent(filePath)}`);
  const json = (await response.json()) as { attributes: { url: string } };
  const download = await fetch(json.attributes.url, { cache: "no-store" });
  if (!download.ok) {
    throw new Error(`Téléchargement ${download.status} pour ${name}`);
  }
  const buffer = Buffer.from(await download.arrayBuffer());
  return keepTail(gunzipSync(buffer).toString("utf8"));
}
