import {
  CharacterClass,
  CharacterSheetStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import {
  getEffectiveDiscordOverride,
  type DiscordEmbedOverride,
  type DiscordTemplateId,
} from "./discord-template-service";
import { getVillageConfigByClass } from "@/lib/character-classes";

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
  body?: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS
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
      signal: AbortSignal.timeout(timeoutMs),
    });

    const responseData = (await res.json().catch(() => null)) as T | null;

    if (!res.ok) {
      const errorMessage =
        (responseData as { message?: string })?.message ||
        `Discord bot returned HTTP ${res.status}: ${res.statusText}`;
      console.error(`[DiscordBot] Request to ${targetUrl} failed (${res.status}): ${errorMessage}`);
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
    console.error(`[DiscordBot] Network/connection error while calling ${targetUrl}:`, error);
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
  customPlayerSpaceUrl?: string,
  override?: DiscordEmbedOverride | null,
  assignedClass?: string | null
): Promise<BotNotificationResult> {
  const defaultPath = status === RegistrationStatus.REJECTED ? "/player/rejection" : "/player";
  const playerSpaceUrl = customPlayerSpaceUrl || getPlayerSpaceUrl(defaultPath);

  let effectiveOverride = override;
  if (effectiveOverride === undefined) {
    let templateId: DiscordTemplateId | null = null;
    if (status === RegistrationStatus.WHITELIST_IN_PROGRESS) templateId = "REGISTRATION_ACCEPTED";
    else if (status === RegistrationStatus.WHITELISTED) templateId = "REGISTRATION_WHITELISTED";
    else if (status === RegistrationStatus.REJECTED) templateId = "REGISTRATION_REJECTED";

    if (templateId) {
      const village = assignedClass ? getVillageConfigByClass(assignedClass) : null;
      effectiveOverride = await getEffectiveDiscordOverride(templateId, {
        playerName: "",
        url: playerSpaceUrl,
        className: village?.className || assignedClass || "",
        villageName: village?.name || "",
        villageInviteUrl: village?.inviteUrl || "",
      }).catch(() => null);
    }
  }

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/registration-status",
    "POST",
    {
      discordId,
      status,
      playerSpaceUrl,
      assignedClass: assignedClass ?? undefined,
      override: effectiveOverride ?? undefined,
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

export type CharacterSheetNotificationStatus = CharacterSheetStatus | "REOPENED";

/**
 * Notifie le joueur par message privé Discord lors de retours, de la validation ou de la réouverture de sa fiche personnage.
 */
export async function notifyPlayerCharacterSheetStatus(
  discordId: string,
  status: CharacterSheetNotificationStatus,
  customPlayerSpaceUrl?: string,
  override?: DiscordEmbedOverride | null
): Promise<BotNotificationResult> {
  const playerSpaceUrl = customPlayerSpaceUrl || getPlayerSpaceUrl("/player/character-sheet");

  let effectiveOverride = override;
  if (effectiveOverride === undefined) {
    let templateId: DiscordTemplateId | null = null;
    if (status === CharacterSheetStatus.VALIDATED) templateId = "SHEET_VALIDATED";
    else if (status === CharacterSheetStatus.PENDING_PLAYER) templateId = "SHEET_FEEDBACK";
    else if (status === "REOPENED" || status === CharacterSheetStatus.DRAFT)
      templateId = "SHEET_REOPENED";

    if (templateId) {
      effectiveOverride = await getEffectiveDiscordOverride(templateId, {
        playerName: "",
        url: playerSpaceUrl,
      }).catch(() => null);
    }
  }

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/character-sheet-status",
    "POST",
    {
      discordId,
      status,
      playerSpaceUrl,
      override: effectiveOverride ?? undefined,
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

export interface InterviewReminderResult {
  success: boolean;
  total: number;
  sent: number;
  dmClosed: number;
  failed: number;
  errors?: string[];
  message?: string;
  error?: string;
}

/**
 * Notifie un ou plusieurs joueurs par message privé Discord pour les inviter à réserver leur créneau d'entretien.
 */
export async function sendInterviewReminders(
  discordIds: string[],
  customInterviewUrl?: string,
  override?: DiscordEmbedOverride | null
): Promise<InterviewReminderResult> {
  const interviewUrl = customInterviewUrl || getPlayerSpaceUrl("/player/interview");

  let effectiveOverride = override;
  if (effectiveOverride === undefined) {
    effectiveOverride = await getEffectiveDiscordOverride("INTERVIEW_REMINDER", {
      playerName: "",
      url: interviewUrl,
    }).catch(() => null);
  }

  const result = await callDiscordBot<InterviewReminderResult>(
    "/notifications/interview-reminder",
    "POST",
    {
      discordIds,
      interviewUrl,
      override: effectiveOverride ?? undefined,
    },
    30000 // 30s timeout pour les relances groupées
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      total: discordIds.length,
      sent: 0,
      dmClosed: 0,
      failed: discordIds.length,
      error: result.error || "Impossible de contacter l'API de HyoriBot.",
    };
  }

  return result.data;
}

export interface TicketMessageNotificationOptions {
  discordId: string;
  ticketId: string;
  ticketSubject: string;
  authorName: string;
  messagePreview?: string | null;
  customTicketUrl?: string;
  override?: DiscordEmbedOverride | null;
}

/**
 * Notifie le joueur par message privé Discord lors de la réception d'un nouveau message sur son ticket.
 */
export async function notifyPlayerTicketMessage(
  options: TicketMessageNotificationOptions
): Promise<BotNotificationResult> {
  const ticketUrl =
    options.customTicketUrl || getPlayerSpaceUrl(`/player/tickets/${options.ticketId}`);

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/ticket-message",
    "POST",
    {
      discordId: options.discordId,
      ticketId: options.ticketId,
      ticketSubject: options.ticketSubject,
      authorName: options.authorName,
      messagePreview: options.messagePreview ?? undefined,
      ticketUrl,
      override: options.override ?? undefined,
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

export interface TicketCreatedNotificationOptions {
  channelId?: string | null;
  mentionRoleId?: string | null;
  ticketId: string;
  ticketSubject: string;
  ticketCategory: string;
  authorName: string;
  ticketDescription?: string | null;
  customTicketStaffUrl?: string;
  override?: DiscordEmbedOverride | null;
}

/**
 * Notifie le staff sur un salon Discord (externe ou configuré) lors de l'ouverture d'un nouveau ticket.
 */
export async function notifyTicketCreated(
  options: TicketCreatedNotificationOptions
): Promise<BotNotificationResult> {
  const ticketStaffUrl =
    options.customTicketStaffUrl || getPlayerSpaceUrl(`/staff/tickets/${options.ticketId}`);

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/ticket-created",
    "POST",
    {
      channelId: options.channelId ?? undefined,
      mentionRoleId: options.mentionRoleId ?? undefined,
      ticketId: options.ticketId,
      ticketSubject: options.ticketSubject,
      ticketCategory: options.ticketCategory,
      authorName: options.authorName,
      ticketDescription: options.ticketDescription ?? undefined,
      ticketStaffUrl,
      override: options.override ?? undefined,
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
      message: "Ticket creation notification sent successfully",
    }
  );
}

export interface TicketTeamSummonedNotificationOptions extends TicketCreatedNotificationOptions {
  team: string;
}

/**
 * Notifie une équipe sur son salon Discord dédié lorsqu'elle est convoquée sur un ticket.
 * L'embed est identique à celui d'une ouverture de ticket.
 */
export async function notifyTicketTeamSummoned(
  options: TicketTeamSummonedNotificationOptions
): Promise<BotNotificationResult> {
  const ticketStaffUrl =
    options.customTicketStaffUrl || getPlayerSpaceUrl(`/staff/tickets/${options.ticketId}`);

  const result = await callDiscordBot<BotNotificationResult>(
    "/notifications/ticket-team-summoned",
    "POST",
    {
      team: options.team,
      channelId: options.channelId ?? undefined,
      mentionRoleId: options.mentionRoleId ?? undefined,
      ticketId: options.ticketId,
      ticketSubject: options.ticketSubject,
      ticketCategory: options.ticketCategory,
      authorName: options.authorName,
      ticketDescription: options.ticketDescription ?? undefined,
      ticketStaffUrl,
      override: options.override ?? undefined,
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
      message: "Ticket team summoned notification sent successfully",
    }
  );
}

export interface DiscordRoleInfo {
  id: string;
  name: string;
  color?: string;
  isWhitelist: boolean;
  isSanctioned: boolean;
  isStaff: boolean;
  isClass: boolean;
}

export interface DiscordMemberRolesSummary {
  discordId: string;
  inGuild: boolean;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  hasWhitelistRole: boolean;
  hasSanctionedRole?: boolean;
  classRoleEnums: CharacterClass[];
  roles: DiscordRoleInfo[];
}

export interface DiscordBatchRolesResult {
  success: boolean;
  members: Record<string, DiscordMemberRolesSummary>;
  error?: string;
}

export async function fetchDiscordBatchRoles(
  discordIds: string[]
): Promise<DiscordBatchRolesResult> {
  const result = await callDiscordBot<{ members: Record<string, DiscordMemberRolesSummary> }>(
    "/members/batch-roles",
    "POST",
    { discordIds }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      members: {},
      error: result.error || "Impossible de récupérer les rôles des membres Discord.",
    };
  }

  return {
    success: true,
    members: result.data.members || {},
  };
}

export interface BroadcastVillageInvitesSummary {
  totalWhitelisted: number;
  sent: number;
  dmClosed: number;
  failed: number;
  noClassRole: number;
  byClass: Record<string, number>;
  skipped?: Array<{ discordId: string; username?: string; displayName?: string; reason?: string }>;
  errors?: string[];
}

export interface BroadcastVillageInvitesResult {
  success: boolean;
  summary?: BroadcastVillageInvitesSummary;
  message?: string;
  error?: string;
}

/**
 * Envoie automatiquement un message privé via HyoriBot à tous les joueurs whitelistés,
 * contenant le lien d'invitation vers le serveur Discord de leur classe.
 */
export async function broadcastVillageInvites(): Promise<BroadcastVillageInvitesResult> {
  const result = await callDiscordBot<{
    success: boolean;
    summary?: BroadcastVillageInvitesSummary;
    message?: string;
  }>("/notifications/broadcast-village-invites", "POST", {}, 30000);

  if (!result.success) {
    return {
      success: false,
      error:
        result.error || "Impossible de contacter le bot Discord pour diffuser les invitations.",
    };
  }

  return {
    success: true,
    summary: result.data?.summary,
    message: result.data?.message,
  };
}

export interface DiscordVillageItem {
  key: string;
  id: string;
  name: string;
  class: string;
  habitantRoleId: string;
  inviteUrl: string | null;
}

/**
 * Récupère la liste des villages Discord et leurs liens d'invitation permanents depuis le bot.
 */
export async function fetchDiscordVillages(): Promise<{
  success: boolean;
  villages: DiscordVillageItem[];
  error?: string;
}> {
  const result = await callDiscordBot<{ success: boolean; villages: DiscordVillageItem[] }>(
    "/villages",
    "GET"
  );

  if (!result.success || !result.data?.villages) {
    return {
      success: false,
      villages: [],
      error: result.error || "Impossible de charger la configuration des villages depuis le bot.",
    };
  }

  return {
    success: true,
    villages: result.data.villages,
  };
}

export interface DiscordSanctionApplyResult {
  success: boolean;
  inGuild: boolean;
  backupId?: string;
  removedRoleIds?: string[];
  assignedRoleId?: string;
  error?: string;
}

/**
 * Applique une sanction d'exclusion sur Discord :
 * - Sauvegarde persistante des rôles actuels du joueur
 * - Retrait de tous ses rôles
 * - Attribution du rôle unique d'exclusion
 * Si le joueur n'est pas présent sur le serveur Discord, l'action est ignorée sans erreur bloquante.
 */
export async function excludePlayerOnDiscord(
  discordId: string,
  reason: string = "Refus d'accès à la whitelist",
  metadata?: Record<string, unknown>
): Promise<DiscordSanctionApplyResult> {
  const result = await callDiscordBot<{
    success: boolean;
    inGuild?: boolean;
    backupId?: string;
    removedRoleIds?: string[];
    assignedRoleId?: string;
    message?: string;
  }>("/sanctions/apply", "POST", {
    discordId,
    type: "EXCLUSION",
    reason,
    notifyDm: false,
    ignoreIfNotInGuild: true,
    metadata,
  });

  if (!result.success || !result.data) {
    if (result.error && result.error.toLowerCase().includes("not found in the guild")) {
      return {
        success: true,
        inGuild: false,
      };
    }
    return {
      success: false,
      inGuild: false,
      error: result.error || "Impossible d'appliquer l'exclusion sur Discord.",
    };
  }

  return {
    success: true,
    inGuild: result.data.inGuild !== false,
    backupId: result.data.backupId,
    removedRoleIds: result.data.removedRoleIds,
    assignedRoleId: result.data.assignedRoleId,
  };
}
