import { jsonError, jsonOk, readJsonBody, requirePluginAuth } from "@/lib/api/plugin-auth";
import {
  findUserByMinecraftUuid,
  parseMinecraftUuid,
  sanctionErrorResponse,
} from "@/lib/api/plugin-players";
import { SanctionSource, SanctionType } from "@/lib/generated/prisma/enums";
import { createSanction, type SanctionActor } from "@/lib/services/sanction-service";

const SANCTION_TYPES = Object.values(SanctionType) as string[];

/**
 * Persists a sanction issued in game. The plugin has already applied it locally;
 * permissions are re-validated here against the application roles.
 * Body: { targetUuid, type, reason, durationSeconds?, issuerUuid: string | null (console) }
 */
export async function POST(request: Request) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Corps de requête invalide.", 400);

  const targetUuid = parseMinecraftUuid(body.targetUuid);
  const type =
    typeof body.type === "string" && SANCTION_TYPES.includes(body.type) ? body.type : null;
  const reason = typeof body.reason === "string" ? body.reason : null;
  const durationSeconds =
    typeof body.durationSeconds === "number" ? body.durationSeconds : undefined;
  const issuerUuid = body.issuerUuid === null ? null : parseMinecraftUuid(body.issuerUuid);

  if (!targetUuid || !type || reason === null || (body.issuerUuid !== null && !issuerUuid)) {
    return jsonError("Paramètres manquants ou invalides.", 400);
  }

  const target = await findUserByMinecraftUuid(targetUuid);
  if (!target) return jsonError("Joueur introuvable sur le service.", 404);

  const issuer: SanctionActor = issuerUuid
    ? { kind: "minecraft", uuid: issuerUuid }
    : { kind: "console" };

  try {
    const sanction = await createSanction({
      targetUserId: target.id,
      type: type as SanctionType,
      reason,
      durationMs: durationSeconds !== undefined ? durationSeconds * 1000 : undefined,
      issuer,
      source: SanctionSource.GAME,
    });

    return jsonOk({
      sanction: {
        id: sanction.id,
        type: sanction.type,
        reason: sanction.reason,
        expiresAt: sanction.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return sanctionErrorResponse(error);
  }
}
