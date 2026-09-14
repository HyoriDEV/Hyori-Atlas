"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

const groupManagerRoles: Role[] = [Role.ADMIN, Role.RP_TRACKING];

export interface RpGroupActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

function revalidateGroupSurfaces(playerId?: string) {
  revalidatePath("/staff/groups");
  revalidatePath("/staff/atlas");
  if (playerId) {
    revalidatePath(`/staff/atlas/${playerId}`);
  }
}

export async function createRpGroupAction(input: {
  name: string;
  description?: string;
  memberIds?: string[];
}): Promise<RpGroupActionResult<{ id: string }>> {
  try {
    const staffUser = await requireRole(groupManagerRoles);

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Le nom du groupe ne peut pas être vide." };
    }
    if (trimmedName.length > 100) {
      return { success: false, error: "Le nom du groupe ne peut pas dépasser 100 caractères." };
    }

    const trimmedDesc = input.description?.trim() || null;
    if (trimmedDesc && trimmedDesc.length > 500) {
      return { success: false, error: "La description ne peut pas dépasser 500 caractères." };
    }

    const memberIds = input.memberIds?.filter(Boolean) || [];

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.rpGroup.create({
        data: {
          name: trimmedName,
          description: trimmedDesc,
          createdById: staffUser.id,
        },
      });

      if (memberIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: memberIds } },
          data: { rpGroupId: created.id },
        });
      }

      return created;
    });

    revalidateGroupSurfaces();
    for (const id of memberIds) {
      revalidatePath(`/staff/atlas/${id}`);
    }

    return { success: true, data: { id: group.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}

export async function updateRpGroupAction(
  groupId: string,
  input: { name: string; description?: string }
): Promise<RpGroupActionResult<void>> {
  try {
    await requireRole(groupManagerRoles);

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Le nom du groupe ne peut pas être vide." };
    }
    if (trimmedName.length > 100) {
      return { success: false, error: "Le nom du groupe ne peut pas dépasser 100 caractères." };
    }

    const trimmedDesc = input.description?.trim() || null;
    if (trimmedDesc && trimmedDesc.length > 500) {
      return { success: false, error: "La description ne peut pas dépasser 500 caractères." };
    }

    await prisma.rpGroup.update({
      where: { id: groupId },
      data: {
        name: trimmedName,
        description: trimmedDesc,
      },
    });

    revalidateGroupSurfaces();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}

export async function deleteRpGroupAction(
  groupId: string
): Promise<RpGroupActionResult<void>> {
  try {
    await requireRole(groupManagerRoles);

    const members = await prisma.user.findMany({
      where: { rpGroupId: groupId },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { rpGroupId: groupId },
        data: { rpGroupId: null },
      }),
      prisma.rpGroup.delete({
        where: { id: groupId },
      }),
    ]);

    revalidateGroupSurfaces();
    for (const m of members) {
      revalidatePath(`/staff/atlas/${m.id}`);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}

export async function addMemberToGroupAction(
  groupId: string,
  userId: string
): Promise<RpGroupActionResult<void>> {
  try {
    await requireRole(groupManagerRoles);

    const group = await prisma.rpGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      return { success: false, error: "Groupe introuvable." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { rpGroupId: groupId },
    });

    revalidateGroupSurfaces(userId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}

export async function removeMemberFromGroupAction(
  userId: string
): Promise<RpGroupActionResult<void>> {
  try {
    await requireRole(groupManagerRoles);

    await prisma.user.update({
      where: { id: userId },
      data: { rpGroupId: null },
    });

    revalidateGroupSurfaces(userId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}

export async function assignPlayerGroupAction(
  userId: string,
  groupId: string | null
): Promise<RpGroupActionResult<void>> {
  try {
    await requireRole(groupManagerRoles);

    if (groupId) {
      const group = await prisma.rpGroup.findUnique({
        where: { id: groupId },
      });
      if (!group) {
        return { success: false, error: "Groupe introuvable." };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { rpGroupId: groupId },
    });

    revalidateGroupSurfaces(userId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Une erreur est survenue.",
    };
  }
}
