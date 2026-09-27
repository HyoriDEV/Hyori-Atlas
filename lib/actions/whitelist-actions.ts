"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterStatus,
  PluginActionType,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { syncPlayerWhitelistClassRole } from "@/lib/services/discord-bot-service";
import { enqueuePluginAction } from "@/lib/services/plugin-action-service";

/**
 * Removes a player from the whitelist (WHITELISTED -> WAITLIST).
 * If the player is connected, the plugin kicks them on its next polling cycle,
 * unless they are also in the plugin's local whitelist.
 */
export async function revokeWhitelist(userId: string) {
  const staffUser = await requireRole([Role.ADMIN]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true, minecraftUuid: true, registrationStatus: true },
  });

  if (!user || user.registrationStatus !== RegistrationStatus.WHITELISTED) {
    throw new Error("Ce joueur n'est pas whitelisté.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId, registrationStatus: RegistrationStatus.WHITELISTED },
      data: { registrationStatus: RegistrationStatus.WAITLIST },
    });
    await tx.registrationStatusHistory.create({
      data: { userId, authorId: staffUser.id, status: RegistrationStatus.WAITLIST },
    });
    if (user.minecraftUuid) {
      await enqueuePluginAction(
        PluginActionType.KICK,
        user.minecraftUuid,
        { cause: "WHITELIST_REVOKED", unlessLocalWhitelist: true },
        tx
      );
    }
  });

  const sheet = await prisma.characterSheet.findFirst({
    where: { playerId: userId, status: CharacterStatus.ACTIVE, assignedClass: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { assignedClass: true },
  });

  if (user.discordId && sheet?.assignedClass) {
    await syncPlayerWhitelistClassRole(user.discordId, false, sheet.assignedClass);
  }

  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${userId}`);
}
