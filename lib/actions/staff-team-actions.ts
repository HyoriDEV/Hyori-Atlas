"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

export async function updateUserRoleAction(targetUserId: string, newRole: Role) {
  const currentUser = await requireRole([Role.ADMIN]);

  if (!Object.values(Role).includes(newRole)) {
    throw new Error("Rôle invalide.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, discordDisplayName: true, minecraftUsername: true },
  });

  if (!targetUser) {
    throw new Error("Utilisateur introuvable.");
  }

  // Protection contre l'auto-rétrogradation de l'administrateur
  if (currentUser.id === targetUserId && newRole !== Role.ADMIN) {
    throw new Error("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  }

  if (targetUser.role === newRole) {
    return { success: true, message: "L'utilisateur possède déjà ce rôle." };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  revalidatePath("/staff/staff-team");
  revalidatePath("/staff");
  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${targetUserId}`);
  revalidatePath("/", "layout");

  return { success: true };
}
