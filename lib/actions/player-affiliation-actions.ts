"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

const distributionAllowedRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];

export interface PlayerAffiliationActionResult {
  success: boolean;
  error?: string;
}

export async function setStaffOverrideChoiceAction(
  sheetId: string,
  data: { classId: string | null; roleId: string | null }
): Promise<PlayerAffiliationActionResult> {
  try {
    await requireRole(distributionAllowedRoles);

    const classId = data.classId;
    const roleId = classId ? data.roleId : null;

    if (roleId) {
      const role = await prisma.playerClassRole.findUnique({
        where: { id: roleId },
        select: { playerClassId: true },
      });

      if (!role || role.playerClassId !== classId) {
        return { success: false, error: "Ce rôle n'appartient pas à la classe sélectionnée." };
      }
    }

    if (classId) {
      const playerClass = await prisma.playerClass.findUnique({
        where: { id: classId },
        select: { id: true },
      });

      if (!playerClass) {
        return { success: false, error: "Classe introuvable." };
      }
    }

    await prisma.characterSheet.update({
      where: { id: sheetId },
      data: {
        overrideClassId: classId,
        overrideRoleId: roleId,
      },
    });

    revalidatePath("/staff/distribution");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la mise à jour du choix retenu.",
    };
  }
}
