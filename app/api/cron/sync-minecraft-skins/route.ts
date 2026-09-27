import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/api/plugin-auth";
import {
  syncAllMinecraftSkins,
  syncUserMinecraftSkin,
} from "@/lib/services/minecraft-skin-service";

export async function POST(request: NextRequest) {
  const secretKey = process.env.CRON_SECRET || process.env.MINECRAFT_API_KEY;

  if (!secretKey) {
    console.error("[CRON_SKINS] Neither CRON_SECRET nor MINECRAFT_API_KEY is configured.");
    return NextResponse.json(
      { success: false, message: "Configuration de sécurité manquante." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearerToken(authHeader, secretKey)) {
    return NextResponse.json({ success: false, message: "Non autorisé." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const uuid = url.searchParams.get("uuid");
    const force = url.searchParams.get("force") === "true";

    // If a specific user or UUID is requested
    if (userId || uuid) {
      const result = await syncUserMinecraftSkin(userId || uuid!, { force });
      return NextResponse.json({ success: result.success, result });
    }

    // Otherwise run the full batch sync
    const maxAgeMinutes = Number(url.searchParams.get("maxAgeMinutes")) || 60;
    const limit = Number(url.searchParams.get("limit")) || undefined;

    const summary = await syncAllMinecraftSkins({
      maxAgeMinutes: force ? 0 : maxAgeMinutes,
      limit,
      delayMs: 200,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Allow GET for simple webhook / cron services that do not send POST
export async function GET(request: NextRequest) {
  return POST(request);
}
