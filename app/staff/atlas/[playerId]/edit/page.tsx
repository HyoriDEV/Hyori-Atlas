import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles } from "@/lib/navigation";
import { SKILL_DEFINITIONS, type SkillValues } from "@/lib/character-sheet";
import type { CharacterSheetFieldValues } from "@/components/character-sheet/character-sheet-fields";
import { getPlayerClassesWithStats } from "@/lib/services/player-class-service";
import { CharacterSwitcher } from "@/components/player/character-switcher";
import { StaffCharacterSheetEditForm } from "@/components/staff/staff-character-sheet-edit-form";

export async function generateMetadata(props: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await props.params;
  const player = await prisma.user.findUnique({
    where: { id: playerId },
    select: { minecraftUsername: true, discordDisplayName: true, discordUsername: true },
  });

  const playerName =
    player?.minecraftUsername || player?.discordDisplayName || player?.discordUsername;
  return {
    title: playerName ? `Édition de la fiche de ${playerName}` : "Édition de la fiche",
  };
}

export default async function StaffCharacterSheetEditPage(props: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ sheetId?: string; characterId?: string }>;
}) {
  const { playerId } = await props.params;
  const searchParams = await props.searchParams;
  await requireRole(characterSheetReviewerRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!player || player.registrationStatus === RegistrationStatus.REJECTED) {
    notFound();
  }

  const targetSheetId = searchParams.sheetId ?? searchParams.characterId;
  const sheet =
    (targetSheetId ? player.characterSheets.find((s) => s.id === targetSheetId) : null) ??
    player.characterSheets.find((s) => s.status === CharacterStatus.ACTIVE) ??
    player.characterSheets[0] ??
    null;

  if (!sheet) {
    notFound();
  }

  const playerName = player.minecraftUsername ?? player.discordDisplayName;

  const fieldValues: CharacterSheetFieldValues = {
    name: sheet.name,
    nickname: sheet.nickname ?? "",
    age: String(sheet.age),
    gender: sheet.gender,
    civilStatus: sheet.civilStatus,
    heightCm: String(
      sheet.heightMeters > 10
        ? Math.round(sheet.heightMeters)
        : Math.round(sheet.heightMeters * 100)
    ),
    description: sheet.description,
    background: sheet.background,
    additionalComments: sheet.additionalComments ?? "",
  };

  const skillValues = Object.fromEntries(
    SKILL_DEFINITIONS.map((skill) => [skill.field, sheet[skill.field]])
  ) as SkillValues;

  const playerClasses = await getPlayerClassesWithStats();

  return (
    <StaffCharacterSheetEditForm
      sheetId={sheet.id}
      playerId={player.id}
      pseudo={playerName}
      initialValues={fieldValues}
      initialSkills={skillValues}
      playerClasses={playerClasses}
      initialAffiliation={{
        primaryClassId: sheet.primaryClassId ?? null,
        primaryRoleId: sheet.primaryRoleId ?? null,
        secondaryClassId: sheet.secondaryClassId ?? null,
        secondaryRoleId: sheet.secondaryRoleId ?? null,
      }}
    >
      {player.characterSheets.length > 1 && (
        <CharacterSwitcher
          characters={player.characterSheets.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            reviewStatus: c.reviewStatus,
            createdAt: c.createdAt,
          }))}
          selectedCharacterId={sheet.id}
        />
      )}
    </StaffCharacterSheetEditForm>
  );
}
