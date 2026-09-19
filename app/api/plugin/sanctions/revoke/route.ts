import { jsonError, jsonOk, readJsonBody, requirePluginAuth } from "@/lib/api/plugin-auth";
import {
  findUserByMinecraftUuid,
  parseMinecraftUuid,
  sanctionErrorResponse,
} from "@/lib/api/plugin-players";
import {
  revokeActiveBans,
  revokeWarning,
  type SanctionActor,
} from "@/lib/services/sanction-service";

/**
 * Lifts a sanction from the game (/unban, /unwarn).
 * Body: { targetUuid, kind: "BAN" | "WARNING", sanctionId?, issuerUuid: string | null (console) }
 */
export async function POST(request: Request) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Corps de requête invalide.", 400);

  const targetUuid = parseMinecraftUuid(body.targetUuid);
  const kind = body.kind === "BAN" || body.kind === "WARNING" ? body.kind : null;
  const sanctionId =
    typeof body.sanctionId === "string" && body.sanctionId.trim()
      ? body.sanctionId.trim()
      : undefined;
  const issuerUuid = body.issuerUuid === null ? null : parseMinecraftUuid(body.issuerUuid);

  if (!targetUuid || !kind || (body.issuerUuid !== null && !issuerUuid)) {
    return jsonError("Paramètres manquants ou invalides.", 400);
  }

  const target = await findUserByMinecraftUuid(targetUuid);
  if (!target) return jsonError("Joueur introuvable sur le service.", 404);

  const revoker: SanctionActor = issuerUuid
    ? { kind: "minecraft", uuid: issuerUuid }
    : { kind: "console" };

  try {
    const revoked =
      kind === "BAN"
        ? await revokeActiveBans(target.id, revoker)
        : [await revokeWarning(target.id, revoker, sanctionId)];

    return jsonOk({ revokedIds: revoked.map((sanction) => sanction.id) });
  } catch (error) {
    return sanctionErrorResponse(error);
  }
}
