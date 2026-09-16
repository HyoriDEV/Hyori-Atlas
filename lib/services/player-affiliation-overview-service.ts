import { prisma } from "@/lib/prisma";
import { CharacterStatus } from "@/lib/generated/prisma/enums";

const UNSPECIFIED_ROLE_LABEL = "Autre";

export interface PlayerAffiliationRow {
  sheetId: string;
  playerId: string;
  playerName: string;
  minecraftUsername: string | null;
  primaryClassId: string | null;
  primaryClassName: string | null;
  primaryRoleId: string | null;
  primaryRoleName: string | null;
  secondaryClassId: string | null;
  secondaryClassName: string | null;
  secondaryRoleId: string | null;
  secondaryRoleName: string | null;
  overrideClassId: string | null;
  overrideRoleId: string | null;
  effectiveClassId: string;
  effectiveClassName: string;
  effectiveRoleId: string | null;
  effectiveRoleName: string;
}

export interface OverviewRoleStat {
  id: string | null;
  name: string;
  count: number;
  percentOfClass: number;
  percentOfTotal: number;
}

export interface OverviewClassStat {
  id: string;
  name: string;
  count: number;
  percentOfTotal: number;
  roles: OverviewRoleStat[];
}

export interface PlayerAffiliationOverview {
  totalPlayers: number;
  classes: OverviewClassStat[];
  players: PlayerAffiliationRow[];
}

export async function getPlayerAffiliationOverview(): Promise<PlayerAffiliationOverview> {
  const sheets = await prisma.characterSheet.findMany({
    where: {
      status: CharacterStatus.ACTIVE,
      primaryClassId: { not: null },
    },
    include: {
      player: {
        select: { id: true, minecraftUsername: true, discordDisplayName: true },
      },
      primaryClass: true,
      primaryRole: true,
      secondaryClass: true,
      secondaryRole: true,
      overrideClass: true,
      overrideRole: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const players: PlayerAffiliationRow[] = sheets.map((sheet) => {
    const effectiveClass = sheet.overrideClassId ? sheet.overrideClass : sheet.primaryClass;
    const effectiveRole = sheet.overrideClassId ? sheet.overrideRole : sheet.primaryRole;

    return {
      sheetId: sheet.id,
      playerId: sheet.player.id,
      playerName: sheet.player.minecraftUsername ?? sheet.player.discordDisplayName,
      minecraftUsername: sheet.player.minecraftUsername,
      primaryClassId: sheet.primaryClassId,
      primaryClassName: sheet.primaryClass?.name ?? null,
      primaryRoleId: sheet.primaryRoleId,
      primaryRoleName:
        sheet.primaryRole?.name ?? (sheet.primaryClassId ? UNSPECIFIED_ROLE_LABEL : null),
      secondaryClassId: sheet.secondaryClassId,
      secondaryClassName: sheet.secondaryClass?.name ?? null,
      secondaryRoleId: sheet.secondaryRoleId,
      secondaryRoleName:
        sheet.secondaryRole?.name ?? (sheet.secondaryClassId ? UNSPECIFIED_ROLE_LABEL : null),
      overrideClassId: sheet.overrideClassId,
      overrideRoleId: sheet.overrideRoleId,
      effectiveClassId: effectiveClass!.id,
      effectiveClassName: effectiveClass!.name,
      effectiveRoleId: effectiveRole?.id ?? null,
      effectiveRoleName: effectiveRole?.name ?? UNSPECIFIED_ROLE_LABEL,
    };
  });

  const classes = await prisma.playerClass.findMany({
    include: {
      roles: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const totalPlayers = players.length;

  const classStats: OverviewClassStat[] = classes.map((playerClass) => {
    const classPlayers = players.filter((p) => p.effectiveClassId === playerClass.id);
    const count = classPlayers.length;

    const roleStats: OverviewRoleStat[] = playerClass.roles.map((role) => {
      const roleCount = classPlayers.filter((p) => p.effectiveRoleId === role.id).length;
      return {
        id: role.id,
        name: role.name,
        count: roleCount,
        percentOfClass: count > 0 ? (roleCount / count) * 100 : 0,
        percentOfTotal: totalPlayers > 0 ? (roleCount / totalPlayers) * 100 : 0,
      };
    });

    const unspecifiedCount = classPlayers.filter((p) => p.effectiveRoleId === null).length;
    if (unspecifiedCount > 0) {
      roleStats.push({
        id: null,
        name: UNSPECIFIED_ROLE_LABEL,
        count: unspecifiedCount,
        percentOfClass: count > 0 ? (unspecifiedCount / count) * 100 : 0,
        percentOfTotal: totalPlayers > 0 ? (unspecifiedCount / totalPlayers) * 100 : 0,
      });
    }

    return {
      id: playerClass.id,
      name: playerClass.name,
      count,
      percentOfTotal: totalPlayers > 0 ? (count / totalPlayers) * 100 : 0,
      roles: roleStats,
    };
  });

  return {
    totalPlayers,
    classes: classStats,
    players,
  };
}
