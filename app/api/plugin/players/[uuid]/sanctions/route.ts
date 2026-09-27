import { jsonError, jsonOk, requirePluginAuth } from "@/lib/api/plugin-auth";
import { findUserByMinecraftUuid, parseMinecraftUuid } from "@/lib/api/plugin-players";
import { SanctionType } from "@/lib/generated/prisma/enums";
import { listSanctions } from "@/lib/services/sanction-service";

export const dynamic = "force-dynamic";

/** Full sanction history of a player, for the in-game /sanctions command. */
export async function GET(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const uuid = parseMinecraftUuid((await params).uuid);
  if (!uuid) return jsonError("UUID invalide.", 400);

  const user = await findUserByMinecraftUuid(uuid);
  if (!user) return jsonError("Joueur introuvable sur le service.", 404);

  const now = new Date();
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === "all" ? undefined : limitParam ? parseInt(limitParam, 10) : 5;
  const safeLimit =
    limit === undefined ? undefined : Number.isInteger(limit) && limit > 0 ? limit : 5;

  const sanctions = await listSanctions(user.id, safeLimit);

  return jsonOk({
    sanctions: sanctions.map((sanction) => ({
      id: sanction.id,
      type: sanction.type,
      reason: sanction.reason,
      source: sanction.source,
      issuedByName: sanction.issuedByName,
      createdAt: sanction.createdAt.toISOString(),
      expiresAt: sanction.expiresAt?.toISOString() ?? null,
      revokedAt: sanction.revokedAt?.toISOString() ?? null,
      revokedByName: sanction.revokedByName,
      active:
        !sanction.revokedAt &&
        (sanction.type === SanctionType.WARNING || !sanction.expiresAt || sanction.expiresAt > now),
    })),
  });
}
