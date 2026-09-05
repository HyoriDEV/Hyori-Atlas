import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAndLinkMinecraftAccount } from "@/lib/services/minecraft-service";
import { checkRateLimit } from "@/lib/rate-limiter";

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

export async function POST(request: NextRequest) {
  const apiKey = process.env.MINECRAFT_API_KEY;

  if (!apiKey) {
    console.error("[MINECRAFT_AUTH] MINECRAFT_API_KEY is not configured.");
    return NextResponse.json(
      { success: false, message: "Configuration serveur incomplète." },
      { status: 500 }
    );
  }

  // 1. Verify authorization header
  const authHeader = request.headers.get("authorization");
  if (!verifyApiKey(authHeader, apiKey)) {
    return NextResponse.json(
      { success: false, message: "Non autorisé." },
      { status: 401 }
    );
  }

  // 2. Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateCheck = checkRateLimit(`mc-auth-ip:${ip}`, 60, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, message: "Trop de requêtes. Veuillez patienter." },
      { status: 429 }
    );
  }

  // 3. Parse and validate JSON body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const { code, minecraftUuid, minecraftUsername } = body ?? {};

  if (!code || typeof code !== "string" || !minecraftUuid || typeof minecraftUuid !== "string" || !minecraftUsername || typeof minecraftUsername !== "string") {
    return NextResponse.json(
      { success: false, message: "Paramètres manquants ou invalides." },
      { status: 400 }
    );
  }

  // Rate limit per code
  const codeRateCheck = checkRateLimit(`mc-auth-code:${code.trim().toUpperCase()}`, 5, 60 * 1000);
  if (!codeRateCheck.allowed) {
    return NextResponse.json(
      { success: false, message: "Code temporairement verrouillé suite à trop d'essais." },
      { status: 429 }
    );
  }

  // 4. Verify code and link account
  const skipMojangCheck = process.env.SKIP_MOJANG_CHECK === "true";
  const result = await verifyAndLinkMinecraftAccount({
    code,
    minecraftUuid,
    minecraftUsername,
    ipAddress: ip,
    skipMojangCheck,
  });

  if (!result.success) {
    const status = result.error === "UUID_ALREADY_LINKED" ? 409 : 400;
    return NextResponse.json(
      { success: false, message: result.message },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    username: result.minecraftUsername,
  });
}
