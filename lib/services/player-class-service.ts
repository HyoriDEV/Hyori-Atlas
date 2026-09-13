import { prisma } from "@/lib/prisma";
import { CharacterStatus } from "@/lib/generated/prisma/enums";

export type RoleBalanceStatus = "RECHERCHE" | "EQUILIBRE" | "SATURE";

export interface SerializedClassRoleWithStats {
  id: string;
  playerClassId: string;
  name: string;
  ratio: number;
  order: number;
  targetPercentage: number;
  playerCount: number;
  status: RoleBalanceStatus;
}

export interface PlayerClassWithStats {
  id: string;
  name: string;
  order: number;
  totalRatio: number;
  totalPlayers: number;
  roles: SerializedClassRoleWithStats[];
}

export function calculateRoleBalanceStatus({
  roleRatio,
  totalClassRatio,
  rolePlayerCount,
  totalClassPlayers,
}: {
  roleRatio: number;
  totalClassRatio: number;
  rolePlayerCount: number;
  totalClassPlayers: number;
}): RoleBalanceStatus {
  if (totalClassRatio <= 0) return "EQUILIBRE";

  const targetShare = roleRatio / totalClassRatio;

  if (totalClassPlayers === 0) {
    return "EQUILIBRE";
  }

  const expectedCount = totalClassPlayers * targetShare;
  const actualShare = rolePlayerCount / totalClassPlayers;

  if (rolePlayerCount === 0 && totalClassPlayers > 0) {
    return "RECHERCHE";
  }

  const ratioComparison = actualShare / targetShare;

  if (ratioComparison > 1.2 && rolePlayerCount > expectedCount + 0.5) {
    return "SATURE";
  }

  if (ratioComparison < 0.8 && rolePlayerCount < expectedCount - 0.5) {
    return "RECHERCHE";
  }

  return "EQUILIBRE";
}

export function getRoleStatusMeta(status: RoleBalanceStatus) {
  switch (status) {
    case "RECHERCHE":
      return {
        label: "Recherché",
        badgeVariant: "outline" as const,
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium",
      };
    case "EQUILIBRE":
      return {
        label: "Équilibré",
        badgeVariant: "outline" as const,
        className:
          "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium",
      };
    case "SATURE":
      return {
        label: "Saturé",
        badgeVariant: "outline" as const,
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium",
      };
  }
}

export async function getPlayerClassesWithStats(): Promise<PlayerClassWithStats[]> {
  const classes = await prisma.playerClass.findMany({
    include: {
      roles: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const activeSheets = await prisma.characterSheet.findMany({
    where: {
      status: CharacterStatus.ACTIVE,
      primaryRoleId: { not: null },
    },
    select: {
      primaryClassId: true,
      primaryRoleId: true,
    },
  });

  const roleCountMap = new Map<string, number>();
  for (const s of activeSheets) {
    if (s.primaryRoleId) {
      roleCountMap.set(s.primaryRoleId, (roleCountMap.get(s.primaryRoleId) ?? 0) + 1);
    }
  }

  return classes.map((c) => {
    const totalRatio = c.roles.reduce((sum, r) => sum + r.ratio, 0);
    const totalPlayers = c.roles.reduce((sum, r) => sum + (roleCountMap.get(r.id) ?? 0), 0);

    const roles: SerializedClassRoleWithStats[] = c.roles.map((r) => {
      const playerCount = roleCountMap.get(r.id) ?? 0;
      const targetPercentage = totalRatio > 0 ? (r.ratio / totalRatio) * 100 : 0;
      const status = calculateRoleBalanceStatus({
        roleRatio: r.ratio,
        totalClassRatio: totalRatio,
        rolePlayerCount: playerCount,
        totalClassPlayers: totalPlayers,
      });

      return {
        id: r.id,
        playerClassId: r.playerClassId,
        name: r.name,
        ratio: r.ratio,
        order: r.order,
        targetPercentage,
        playerCount,
        status,
      };
    });

    return {
      id: c.id,
      name: c.name,
      order: c.order,
      totalRatio,
      totalPlayers,
      roles,
    };
  });
}
