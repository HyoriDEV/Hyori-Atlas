import { jsonError, jsonOk, readJsonBody, requirePluginAuth } from "@/lib/api/plugin-auth";
import { acknowledgePluginActions } from "@/lib/services/plugin-action-service";

/** Body: { ids: string[] } */
export async function POST(request: Request) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : null;

  if (!ids || ids.length > 500) {
    return jsonError("Paramètres manquants ou invalides.", 400);
  }

  const acknowledged = await acknowledgePluginActions(ids);
  return jsonOk({ acknowledged });
}
