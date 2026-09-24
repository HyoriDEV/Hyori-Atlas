"use server";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterClass,
  CharacterSheetStatus,
  CharacterStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  fetchDiscordBatchRoles,
  syncPlayerWhitelistClassRole,
  type DiscordRoleInfo,
} from "@/lib/services/discord-bot-service";

export interface WhitelistedPlayerRoleAuditItem {
  id: string;
  discordId: string;
  discordUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  minecraftUsername: string | null;
  rpName: string;
  characterSheetId: string | null;
  assignedClass: CharacterClass | null;
  assignedClassLabel: string | null;
  minecraftSkinUrl: string | null;

  // Statut Discord
  inGuild: boolean;
  hasWhitelistRole: boolean;
  hasClassRole: boolean;
  hasOtherClassRole: boolean;
  currentClassRoles: CharacterClass[];
  missingRoles: string[];
  hasAnomaly: boolean;
  discordRoles: DiscordRoleInfo[];
}

export interface WhitelistRoleAuditSummary {
  total: number;
  anomalies: number;
  compliant: number;
  botReachable: boolean;
  errorMessage?: string;
}

export interface WhitelistRoleAuditResult {
  success: boolean;
  players: WhitelistedPlayerRoleAuditItem[];
  summary: WhitelistRoleAuditSummary;
  error?: string;
}

const CLASS_LABELS: Record<CharacterClass, string> = {
  [CharacterClass.NOBLE]: "Grande ville",
  [CharacterClass.PAYSAN]: "Village des paysans",
  [CharacterClass.PECHEUR]: "Village de pêche",
  [CharacterClass.MINEUR]: "Village des mines",
  [CharacterClass.ERUDIT]: "Village des érudits",
};

export async function getWhitelistedPlayersRoleAuditAction(): Promise<WhitelistRoleAuditResult> {
  await requireRole([Role.ADMIN]);

  try {
    const users = await prisma.user.findMany({
      where: {
        registrationStatus: RegistrationStatus.WHITELISTED,
      },
      select: {
        id: true,
        discordId: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
        minecraftUsername: true,
        minecraftSkinUrl: true,
        characterSheets: {
          select: {
            id: true,
            status: true,
            reviewStatus: true,
            name: true,
            assignedClass: true,
            primaryClass: { select: { id: true, name: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ minecraftUsername: "asc" }, { discordDisplayName: "asc" }],
    });

    const discordIds = users.map((u) => u.discordId).filter(Boolean);
    const botResult = await fetchDiscordBatchRoles(discordIds);
    const discordMap = botResult.success ? botResult.members : {};

    const auditedPlayers: WhitelistedPlayerRoleAuditItem[] = users.map((u) => {
      const activeSheet =
        u.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE) ??
        u.characterSheets.find((s) => s.reviewStatus === CharacterSheetStatus.VALIDATED) ??
        u.characterSheets[0] ??
        null;

      const assignedClass = activeSheet?.assignedClass ?? null;
      const assignedClassLabel = assignedClass
        ? (CLASS_LABELS[assignedClass as CharacterClass] ?? assignedClass)
        : null;
      const rpName = activeSheet?.name ?? u.minecraftUsername ?? u.discordDisplayName;
      const discordData = discordMap[u.discordId];

      const inGuild = botResult.success ? (discordData?.inGuild ?? false) : true;
      const hasWhitelistRole = Boolean(discordData?.hasWhitelistRole);
      const currentClassRoles = discordData?.classRoleEnums ?? [];
      const hasClassRole = Boolean(assignedClass && currentClassRoles.includes(assignedClass));
      const hasOtherClassRole = Boolean(
        assignedClass && currentClassRoles.some((cls) => cls !== assignedClass)
      );

      const missingRoles: string[] = [];
      if (!inGuild && botResult.success) {
        missingRoles.push("Absent du Discord");
      }
      if (!hasWhitelistRole) {
        missingRoles.push("Rôle Whitelist");
      }
      if (!assignedClass) {
        missingRoles.push("Classe non définie");
      } else if (!hasClassRole) {
        missingRoles.push(`Rôle ${assignedClassLabel}`);
      }

      const hasAnomaly = !inGuild || !hasWhitelistRole || !hasClassRole || !assignedClass;

      return {
        id: u.id,
        discordId: u.discordId,
        discordUsername: u.discordUsername,
        discordDisplayName: u.discordDisplayName,
        discordAvatarUrl: u.discordAvatarUrl,
        minecraftUsername: u.minecraftUsername,
        rpName,
        characterSheetId: activeSheet?.id ?? null,
        assignedClass,
        assignedClassLabel,
        minecraftSkinUrl: u.minecraftSkinUrl ?? null,
        inGuild,
        hasWhitelistRole,
        hasClassRole,
        hasOtherClassRole,
        currentClassRoles,
        missingRoles,
        hasAnomaly,
        discordRoles: discordData?.roles ?? [],
      };
    });

    // Tri critique : les anomalies EN PREMIER TOUT EN HAUT, puis par nom RP
    auditedPlayers.sort((a, b) => {
      if (a.hasAnomaly && !b.hasAnomaly) return -1;
      if (!a.hasAnomaly && b.hasAnomaly) return 1;
      if (a.hasAnomaly && b.hasAnomaly) {
        if (a.missingRoles.length !== b.missingRoles.length) {
          return b.missingRoles.length - a.missingRoles.length;
        }
      }
      return a.rpName.localeCompare(b.rpName, "fr", { sensitivity: "base" });
    });

    const anomalies = auditedPlayers.filter((p) => p.hasAnomaly).length;
    const compliant = auditedPlayers.length - anomalies;

    return {
      success: true,
      players: auditedPlayers,
      summary: {
        total: auditedPlayers.length,
        anomalies,
        compliant,
        botReachable: botResult.success,
        errorMessage: botResult.error,
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erreur inattendue lors de l'audit des rôles.";
    return {
      success: false,
      players: [],
      summary: {
        total: 0,
        anomalies: 0,
        compliant: 0,
        botReachable: false,
        errorMessage: msg,
      },
      error: msg,
    };
  }
}

export async function resyncSingleWhitelistedPlayerRolesAction(userId: string): Promise<{
  success: boolean;
  updatedPlayer?: WhitelistedPlayerRoleAuditItem;
  error?: string;
}> {
  await requireRole([Role.ADMIN]);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        discordId: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
        minecraftUsername: true,
        minecraftSkinUrl: true,
        characterSheets: {
          select: {
            id: true,
            status: true,
            reviewStatus: true,
            name: true,
            assignedClass: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Joueur introuvable." };
    }

    const activeSheet =
      user.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE) ??
      user.characterSheets.find((s) => s.reviewStatus === CharacterSheetStatus.VALIDATED) ??
      user.characterSheets[0] ??
      null;

    const assignedClass = activeSheet?.assignedClass ?? null;
    if (!assignedClass) {
      return {
        success: false,
        error: "Ce joueur n'a pas de classe RP valide enregistrée sur sa fiche personnage.",
      };
    }

    const assignedClassLabel = CLASS_LABELS[assignedClass as CharacterClass] ?? assignedClass;

    const syncResult = await syncPlayerWhitelistClassRole(user.discordId, true, assignedClass);
    if (!syncResult.success) {
      return {
        success: false,
        error: syncResult.error || "Le bot Discord n'a pas pu appliquer les rôles.",
      };
    }

    // Récupérer les nouveaux rôles Discord après synchro
    const botResult = await fetchDiscordBatchRoles([user.discordId]);
    const discordData = botResult.members[user.discordId];

    const inGuild = discordData?.inGuild ?? true;
    const hasWhitelistRole = Boolean(discordData?.hasWhitelistRole);
    const currentClassRoles = discordData?.classRoleEnums ?? [];
    const hasClassRole = Boolean(currentClassRoles.includes(assignedClass));
    const hasOtherClassRole = Boolean(currentClassRoles.some((cls) => cls !== assignedClass));

    const missingRoles: string[] = [];
    if (!inGuild) missingRoles.push("Absent du Discord");
    if (!hasWhitelistRole) missingRoles.push("Rôle Whitelist");
    if (!hasClassRole) missingRoles.push(`Rôle ${assignedClassLabel}`);

    const hasAnomaly = !inGuild || !hasWhitelistRole || !hasClassRole;

    const updatedPlayer: WhitelistedPlayerRoleAuditItem = {
      id: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordDisplayName: user.discordDisplayName,
      discordAvatarUrl: user.discordAvatarUrl,
      minecraftUsername: user.minecraftUsername,
      rpName: activeSheet?.name ?? user.minecraftUsername ?? user.discordDisplayName,
      characterSheetId: activeSheet?.id ?? null,
      assignedClass,
      assignedClassLabel,
      minecraftSkinUrl: user.minecraftSkinUrl ?? null,
      inGuild,
      hasWhitelistRole,
      hasClassRole,
      hasOtherClassRole,
      currentClassRoles,
      missingRoles,
      hasAnomaly,
      discordRoles: discordData?.roles ?? [],
    };

    return {
      success: true,
      updatedPlayer,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur inattendue lors de la resynchronisation du joueur.",
    };
  }
}
