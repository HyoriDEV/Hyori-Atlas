import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/api/plugin-auth";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function GET(request: NextRequest) {
  const apiKey = process.env.MINECRAFT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "Configuration serveur incomplète." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearerToken(authHeader, apiKey)) {
    return NextResponse.json({ success: false, message: "Non autorisé." }, { status: 401 });
  }

  const settings = await getGlobalSettings();

  return NextResponse.json({
    success: true,
    serverAddress: settings.minecraftServerAddress,
    serverVersion: settings.minecraftServerVersion,
    authCommand: settings.minecraftAuthCommand,
  });
}
