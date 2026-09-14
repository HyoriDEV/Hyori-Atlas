import { prisma } from "@/lib/prisma";
import { CharacterStatus } from "@/lib/generated/prisma/enums";
import {
  calculateRoleBalanceStatus,
  type PlayerClassWithStats,
  type RoleBalanceStatus,
  type SerializedClassRoleWithStats,
} from "@/lib/role-balance";

export {
  calculateRoleBalanceStatus,
  getRoleStatusMeta,
  type PlayerClassWithStats,
  type RoleBalanceStatus,
  type SerializedClassRoleWithStats,
} from "@/lib/role-balance";

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
      const status: RoleBalanceStatus = calculateRoleBalanceStatus({
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
