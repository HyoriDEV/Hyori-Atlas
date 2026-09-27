import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";

export function verifyBearerToken(authHeader: string | null, expectedKey?: string): boolean {
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

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export function jsonOk(data: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, ...data });
}

/**
 * Checks the shared Bearer token sent by the Minecraft plugin.
 * Returns an error response to send back, or null when the request is authorized.
 */
export function requirePluginAuth(request: Request, expectedKey = process.env.MINECRAFT_API_KEY) {
  if (!expectedKey) {
    console.error("[PLUGIN_API] MINECRAFT_API_KEY is not configured.");
    return jsonError("Configuration serveur incomplète.", 500);
  }

  if (!verifyBearerToken(request.headers.get("authorization"), expectedKey)) {
    return jsonError("Non autorisé.", 401);
  }

  return null;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
