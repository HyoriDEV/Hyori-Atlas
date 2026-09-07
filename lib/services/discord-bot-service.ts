import { CharacterClass, CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";

export interface BotNotificationResult {
  success: boolean;
  notified?: boolean;
  dmClosed?: boolean;
  message?: string;
  error?: string;
}

export interface BotRoleSyncResult {
  success: boolean;
  whitelisted?: boolean;
  classRole?: string | null;
  rolesAdded?: string[];
  rolesRemoved?: string[];
  message?: string;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 5000;

function getBotConfig() {
  const defaultUrl =
    process.env.NODE_ENV === "production"
      ? "http://bot:4000/api/v1"
      : "http://127.0.0.1:4000/api/v1";
  const apiUrl = (process.env.DISCORD_BOT_API_URL || defaultUrl).replace(/\/$/, "");
  const apiKey = process.env.INTERNAL_BOT_API_KEY || "";
  return { apiUrl, apiKey };
}

export function getAtlasBaseUrl(): string {
  const rawUrl = process.env.NEXTAUTH_URL || "https://hyori-rp.fr";
  return rawUrl.replace(/\/$/, "");
}

export function getPlayerSpaceUrl(path = "/player"): string {
  const base = getAtlasBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function callDiscordBot<T = unknown>(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { apiUrl, apiKey } = getBotConfig();

  if (!apiKey) {
    console.warn(`[DiscordBot] INTERNAL_BOT_API_KEY is not set. Skipping bot call to ${endpoint}`);
    return {
      success: false,
      error: "INTERNAL_BOT_API_KEY is not configured",
    };
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const targetUrl = `${apiUrl}${normalizedEndpoint}`;

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const responseData = (await res.json().catch(() => null)) as T | null;

    if (!res.ok) {
      const errorMessage =
        (responseData as { message?: string })?.message ||
        `Discord bot returned HTTP ${res.status}: ${res.statusText}`;
      console.warn(`[DiscordBot] Request to ${endpoint} failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: responseData ?? undefined,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: { code?: string; message?: string } };
    const causeCode = err?.cause?.code || err?.cause?.message;
    const details = causeCode ? ` (${causeCode})` : "";
    const message = err?.message
      ? `${err.message}${details} [Cible: ${targetUrl}]`
      : `Erreur de connexion inconnue [Cible: ${targetUrl}]`;
    console.warn(`[DiscordBot] Network/connection error while calling ${targetUrl}:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Notifie le joueur par message privé Discord lors de l'évolution de son statut d'inscription.
 */
export async function notifyPlayerRegistrationStatus(
  discordId: string,
  status: RegistrationStatus,
  customPlayerSpaceUrl?: string
): Promise<BotNotificationResult> {
  const playerSpaceUrl = customPlayerSpaceUrl || getPlayerSpaceUrl("/player");

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/registration-status",
    "POST",
    {
      discordId,
      status,
      playerSpaceUrl,
    }
  );

  if (!result.success) {
    return {
      success: false,
      notified: false,
      error: result.error,
    };
  }

  return (
    result.data ?? {
      success: true,
      notified: true,
      message: "Notification sent successfully",
    }
  );
}

/**
 * Notifie le joueur par message privé Discord lors de retours déposés sur sa fiche personnage.
 */
export async function notifyPlayerCharacterSheetStatus(
  discordId: string,
  status: CharacterSheetStatus,
  customPlayerSpaceUrl?: string
): Promise<BotNotificationResult> {
  const playerSpaceUrl = customPlayerSpaceUrl || getPlayerSpaceUrl("/player/character-sheet");

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/character-sheet-status",
    "POST",
    {
      discordId,
      status,
      playerSpaceUrl,
    }
  );

  if (!result.success) {
    return {
      success: false,
      notified: false,
      error: result.error,
    };
  }

  return (
    result.data ?? {
      success: true,
      notified: true,
      message: "Notification sent successfully",
    }
  );
}

/**
 * Synchronise l'attribution de la whitelist et de la classe RP du joueur sur le serveur Discord.
 */
export async function syncPlayerWhitelistClassRole(
  discordId: string,
  whitelisted: boolean,
  classRole: CharacterClass
): Promise<BotRoleSyncResult> {
  const result = await callDiscordBot<BotRoleSyncResult>("/roles/whitelist-class", "POST", {
    discordId,
    whitelisted,
    classRole,
  });

  if (!result.success) {
    return {
      success: false,
      whitelisted,
      classRole,
      error: result.error,
    };
  }

  return (
    result.data ?? {
      success: true,
      whitelisted,
      classRole,
      message: "Roles synchronized successfully",
    }
  );
}

export interface BotHealthResponse {
  success: boolean;
  service?: string;
  status?: string;
  timestamp?: string;
  uptime?: number;
  discord?: {
    ready: boolean;
    pingMs: number;
    guildsCached: number;
  };
  queue?: {
    queueLength: number;
    activeWorkers: number;
    totalProcessed: number;
    totalFailed: number;
  };
  error?: string;
}

/**
 * Diagnostic de l'état de l'API interne du bot et de sa connexion à Discord.
 */
export async function checkBotHealth(): Promise<BotHealthResponse> {
  const result = await callDiscordBot<BotHealthResponse>("/health", "GET");
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || "Impossible de contacter l'API du bot Discord",
    };
  }
  return result.data;
}

