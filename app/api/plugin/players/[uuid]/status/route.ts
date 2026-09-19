import { jsonError, jsonOk, requirePluginAuth } from "@/lib/api/plugin-auth";
import { findUserByMinecraftUuid, parseMinecraftUuid } from "@/lib/api/plugin-players";
import { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { getActiveBan } from "@/lib/services/sanction-service";

export const dynamic = "force-dynamic";

/** Live login status of a player: always read from the database, never cached. */
export async function GET(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const uuid = parseMinecraftUuid((await params).uuid);
  if (!uuid) return jsonError("UUID invalide.", 400);

  const user = await findUserByMinecraftUuid(uuid);
  if (!user) {
    return jsonOk({
      linked: false,
      username: null,
      role: null,
      isStaff: false,
      whitelisted: false,
      activeBan: null,
    });
  }

  const ban = await getActiveBan(user.id);

  return jsonOk({
    linked: true,
    username: user.minecraftUsername,
    role: user.role,
    isStaff: user.role !== Role.PLAYER,
    whitelisted: user.registrationStatus === RegistrationStatus.WHITELISTED,
    activeBan: ban
      ? {
          id: ban.id,
          type: ban.type,
          reason: ban.reason,
          expiresAt: ban.expiresAt?.toISOString() ?? null,
        }
      : null,
  });
}
