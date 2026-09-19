import { jsonOk, requirePluginAuth } from "@/lib/api/plugin-auth";
import { listPendingPluginActions } from "@/lib/services/plugin-action-service";

export const dynamic = "force-dynamic";

/** Actions triggered from the dashboard, polled by the plugin until acknowledged. */
export async function GET(request: Request) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const actions = await listPendingPluginActions();

  return jsonOk({
    actions: actions.map((action) => ({
      id: action.id,
      type: action.type,
      targetUuid: action.targetUuid,
      payload: action.payload,
      createdAt: action.createdAt.toISOString(),
    })),
  });
}
