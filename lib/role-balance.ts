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
        className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium",
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
