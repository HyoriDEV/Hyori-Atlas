import "server-only";

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/plugin-auth";
import { normalizeMinecraftUuid } from "@/lib/services/minecraft-service";
import { SanctionError, type SanctionErrorCode } from "@/lib/services/sanction-service";

const SANCTION_ERROR_STATUS: Record<SanctionErrorCode, number> = {
  INVALID_REASON: 400,
  INVALID_DURATION: 400,
  TARGET_NOT_FOUND: 404,
  TARGET_IS_STAFF: 403,
  ISSUER_NOT_STAFF: 403,
  ALREADY_EXCLUDED: 409,
  NO_ACTIVE_SANCTION: 404,
  SANCTION_NOT_FOUND: 404,
};

/** Maps a SanctionError to an API response; rethrows anything else. */
export function sanctionErrorResponse(error: unknown) {
  if (error instanceof SanctionError) {
    return jsonError(error.message, SANCTION_ERROR_STATUS[error.code], { error: error.code });
  }
  throw error;
}

export function parseMinecraftUuid(value: unknown): string | null {
  return typeof value === "string" ? normalizeMinecraftUuid(value) : null;
}

export async function findUserByMinecraftUuid(uuid: string) {
  return prisma.user.findUnique({
    where: { minecraftUuid: uuid },
    select: {
      id: true,
      role: true,
      registrationStatus: true,
      minecraftUuid: true,
      minecraftUsername: true,
    },
  });
}
