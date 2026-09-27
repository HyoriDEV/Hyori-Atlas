import { jsonError, jsonOk, requirePluginAuth } from "@/lib/api/plugin-auth";
import { findUserByMinecraftUuid, parseMinecraftUuid } from "@/lib/api/plugin-players";
import { SKILL_DEFINITIONS } from "@/lib/character-sheet";
import { CharacterStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Active character sheet of a player, as consumed by the plugin. */
export async function GET(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const unauthorized = requirePluginAuth(request);
  if (unauthorized) return unauthorized;

  const uuid = parseMinecraftUuid((await params).uuid);
  if (!uuid) return jsonError("UUID invalide.", 400);

  const user = await findUserByMinecraftUuid(uuid);
  if (!user) return jsonOk({ character: null });

  const sheet = await prisma.characterSheet.findFirst({
    where: { playerId: user.id, status: CharacterStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
  });
  if (!sheet) return jsonOk({ character: null });

  // Legacy sheets stored the height in cm instead of metres.
  const heightCm =
    sheet.heightMeters > 10 ? Math.round(sheet.heightMeters) : Math.round(sheet.heightMeters * 100);

  return jsonOk({
    character: {
      id: sheet.id,
      name: sheet.name,
      nickname: sheet.nickname,
      age: sheet.age,
      gender: sheet.gender,
      civilStatus: sheet.civilStatus,
      heightCm,
      assignedClass: sheet.assignedClass,
      reviewStatus: sheet.reviewStatus,
      skills: Object.fromEntries(SKILL_DEFINITIONS.map(({ field }) => [field, sheet[field]])),
      updatedAt: sheet.updatedAt.toISOString(),
    },
  });
}
