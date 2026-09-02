import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles, characterSheetStatusLabels } from "@/lib/navigation";
import { characterSheetStatusBadgeVariant } from "@/lib/atlas-status";
import { SKILL_DEFINITIONS, type SkillValues } from "@/lib/character-sheet";
import type { SheetComment } from "@/lib/character-sheet-comments";
import { Badge } from "@/components/ui/badge";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { SheetEvaluationWorkspace } from "@/components/dashboard/sheet-evaluation-workspace";
import type { CharacterSheetFieldValues } from "@/components/character-sheet/character-sheet-fields";

export default async function CharacterSheetEvaluationPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  await requireRole(characterSheetReviewerRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheet: {
        include: {
          comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
        },
      },
    },
  });

  if (!player?.characterSheet || player.registrationStatus === RegistrationStatus.REJECTED) {
    notFound();
  }

  const sheet = player.characterSheet;
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

  const comments: SheetComment[] = sheet.comments.map((comment) => ({
    id: comment.id,
    target: comment.target,
    body: comment.body,
    anchor:
      comment.quotedText !== null && comment.anchorStart !== null
        ? {
            quotedText: comment.quotedText,
            anchorStart: comment.anchorStart,
            anchorPrefix: comment.anchorPrefix ?? "",
            anchorSuffix: comment.anchorSuffix ?? "",
          }
        : null,
    authorName: comment.author?.discordDisplayName ?? "Ex-staff",
    createdAt: comment.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AtlasBackButton />
        <h1 className="font-heading flex-1 text-lg font-semibold">
          {sheet.reviewStatus === CharacterSheetStatus.PENDING_STAFF
            ? `Évaluation de la fiche de ${playerName}`
            : `Fiche personnage de ${playerName}`}
        </h1>
        <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}>
          {characterSheetStatusLabels[sheet.reviewStatus]}
        </Badge>
      </div>

      <SheetEvaluationWorkspace
        sheetId={sheet.id}
        playerId={player.id}
        pseudo={playerName}
        status={sheet.reviewStatus}
        sheetUpdatedAt={sheet.updatedAt.toISOString()}
        fieldValues={fieldValues}
        skillValues={skillValues}
        initialComments={comments}
      />
    </div>
  );
}
