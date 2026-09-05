import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGlobalSettings } from "@/lib/services/settings-service";

function verifyApiKey(authHeader: string | null, expectedKey?: string): boolean {
  if (!authHeader || !expectedKey) return false;
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;

  const bufToken = Buffer.from(token);
  const bufExpected = Buffer.from(expectedKey);

  if (bufToken.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufToken, bufExpected);
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MINECRAFT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "Configuration serveur incomplète." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyApiKey(authHeader, apiKey)) {
    return NextResponse.json(
      { success: false, message: "Non autorisé." },
      { status: 401 }
    );
  }

  const settings = await getGlobalSettings();

  return NextResponse.json({
    success: true,
    serverAddress: settings.minecraftServerAddress,
    serverVersion: settings.minecraftServerVersion,
    authCommand: settings.minecraftAuthCommand,
  });
}
