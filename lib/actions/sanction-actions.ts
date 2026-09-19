"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { SanctionSource, SanctionType } from "@/lib/generated/prisma/enums";
import { allStaffRoles } from "@/lib/navigation";
import { createSanction, revokeSanctionById, SanctionError } from "@/lib/services/sanction-service";

export type SuspensionUnit = "minutes" | "hours" | "days" | "weeks";

const UNIT_TO_MS: Record<SuspensionUnit, number> = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

async function runSanctionOperation<T>(playerId: string, operation: () => Promise<T>) {
  try {
    await operation();
  } catch (error) {
    // Rethrow as a plain Error so the toast shows the French message.
    if (error instanceof SanctionError) throw new Error(error.message);
    throw error;
  }
  revalidatePath(`/staff/atlas/${playerId}`);
}

async function issueSanction(
  playerId: string,
  type: SanctionType,
  reason: string,
  durationMs?: number
) {
  const staffUser = await requireRole(allStaffRoles);
  await runSanctionOperation(playerId, () =>
    createSanction({
      targetUserId: playerId,
      type,
      reason,
      durationMs,
      issuer: { kind: "user", userId: staffUser.id },
      source: SanctionSource.WEB,
    })
  );
}

export async function warnPlayer(playerId: string, reason: string) {
  await issueSanction(playerId, SanctionType.WARNING, reason);
}

export async function suspendPlayer(
  playerId: string,
  reason: string,
  amount: number,
  unit: SuspensionUnit
) {
  if (!Number.isInteger(amount) || amount <= 0 || !(unit in UNIT_TO_MS)) {
    throw new Error("La durée de suspension est invalide.");
  }
  await issueSanction(playerId, SanctionType.SUSPENSION, reason, amount * UNIT_TO_MS[unit]);
}

export async function excludePlayer(playerId: string, reason: string) {
  await issueSanction(playerId, SanctionType.EXCLUSION, reason);
}

export async function revokeSanction(playerId: string, sanctionId: string) {
  const staffUser = await requireRole(allStaffRoles);
  await runSanctionOperation(playerId, () =>
    revokeSanctionById(playerId, sanctionId, { kind: "user", userId: staffUser.id })
  );
}
