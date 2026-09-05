import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels, isRegistrationStatusAtLeast } from "@/lib/navigation";
import { characterSheetStatusBadgeVariant } from "@/lib/atlas-status";
import {
  SKILL_DEFINITIONS,
  isCharacterSheetEditable,
  type SkillValues,
} from "@/lib/character-sheet";
import type { SheetComment } from "@/lib/character-sheet-comments";
import { Badge } from "@/components/ui/badge";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { CharacterSheetForm } from "@/components/player/character-sheet-form";
import type { CharacterSheetFieldValues } from "@/components/character-sheet/character-sheet-fields";

export default async function CharacterSheetPage() {
  const user = await requireActivePlayer();
  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELIST_IN_PROGRESS
  );

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold">Fiche personnage</h1>
        <LockedFeatureCard description="Disponible une fois ta candidature acceptée depuis la liste d'attente par un administrateur." />
      </div>
    );
  }

  const sheet = await prisma.characterSheet.findUnique({
    where: { playerId: user.id },
    include: { comments: { orderBy: { createdAt: "asc" }, include: { author: true } } },
  });

  const fieldValues: CharacterSheetFieldValues = {
    name: sheet?.name ?? "",
    nickname: sheet?.nickname ?? "",
    age: sheet ? String(sheet.age) : "",
    gender: sheet?.gender ?? "",
    civilStatus: sheet?.civilStatus ?? "",
    heightCm: sheet
      ? String(
          sheet.heightMeters > 10
            ? Math.round(sheet.heightMeters)
            : Math.round(sheet.heightMeters * 100)
        )
      : "",
    description: sheet?.description ?? "",
    background: sheet?.background ?? "",
    additionalComments: sheet?.additionalComments ?? "",
  };

  const skillValues = Object.fromEntries(
    SKILL_DEFINITIONS.map((skill) => [skill.field, sheet ? sheet[skill.field] : 1])
  ) as SkillValues;

  const currentStatus = sheet?.reviewStatus ?? CharacterSheetStatus.PENDING_PLAYER;
  const editable = !sheet || isCharacterSheetEditable(sheet.reviewStatus);

  const comments: SheetComment[] = (sheet?.comments ?? []).map((comment) => ({
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
    authorName: comment.author?.discordDisplayName ?? "Staff",
    createdAt: comment.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Fiche personnage</h1>
        {sheet && (
          <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}>
            {characterSheetStatusLabels[sheet.reviewStatus]}
          </Badge>
        )}
      </div>
      <CharacterSheetForm
        initialValues={fieldValues}
        initialSkills={skillValues}
        initialClasses={sheet?.chosenClasses ?? []}
        editable={editable}
        status={currentStatus}
        comments={comments}
        minecraftUsername={user.minecraftUsername}
      />
    </div>
  );
}
