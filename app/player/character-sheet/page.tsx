import { requireActivePlayer } from "@/lib/dal";
import { getPlayerCharacters } from "@/lib/services/character-service";
import { CharacterSheetStatus, CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels, characterStatusLabels, isRegistrationStatusAtLeast } from "@/lib/navigation";
import { characterSheetStatusBadgeVariant, characterStatusBadgeVariant } from "@/lib/atlas-status";
import {
  SKILL_DEFINITIONS,
  isCharacterSheetEditable,
  type SkillValues,
} from "@/lib/character-sheet";
import type { SheetComment } from "@/lib/character-sheet-comments";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { CharacterSheetForm } from "@/components/player/character-sheet-form";
import { CharacterSwitcher } from "@/components/player/character-switcher";
import type { CharacterSheetFieldValues } from "@/components/character-sheet/character-sheet-fields";

export default async function CharacterSheetPage(props: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  const user = await requireActivePlayer();
  const searchParams = await props.searchParams;
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

  const allCharacters = await getPlayerCharacters(user.id);

  // Trouver le personnage cible : soit via searchParams, soit le personnage ACTIVE, soit le premier
  let sheet = allCharacters.find((c) => c.id === searchParams.characterId);
  if (!sheet) {
    sheet = allCharacters.find((c) => c.status === CharacterStatus.ACTIVE) ?? allCharacters[0] ?? null;
  }

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

  const currentReviewStatus = sheet?.reviewStatus ?? CharacterSheetStatus.PENDING_PLAYER;
  const isCharacterActive = sheet?.status === CharacterStatus.ACTIVE;
  const editable = isCharacterActive && (!sheet || isCharacterSheetEditable(sheet.reviewStatus));

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Fiche personnage</h1>
        {sheet && (
          <div className="flex items-center gap-2">
            <Badge variant={characterStatusBadgeVariant(sheet.status)}>
              {characterStatusLabels[sheet.status]}
            </Badge>
            <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}>
              {characterSheetStatusLabels[sheet.reviewStatus]}
            </Badge>
          </div>
        )}
      </div>

      {allCharacters.length > 1 && sheet && (
        <CharacterSwitcher
          characters={allCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            reviewStatus: c.reviewStatus,
            createdAt: c.createdAt,
          }))}
          selectedCharacterId={sheet.id}
        />
      )}

      {sheet && !isCharacterActive && (
        <Card className="border-border/60 bg-muted/40 flex flex-col gap-1 p-4">
          <p className="text-foreground text-sm font-semibold">
            {sheet.status === CharacterStatus.DEAD
              ? "Ce personnage est décédé en jeu de rôle (Mort)."
              : "Ce personnage a été désactivé par l'équipe d'administration."}
          </p>
          <p className="text-muted-foreground text-xs">
            Cette fiche est archivée en lecture seule. Tu peux consulter les informations et commentaires d&apos;évaluation, mais elle ne peut plus être modifiée.
          </p>
        </Card>
      )}

      <CharacterSheetForm
        sheetId={sheet?.id}
        initialValues={fieldValues}
        initialSkills={skillValues}
        initialClasses={sheet?.chosenClasses ?? []}
        editable={editable}
        status={currentReviewStatus}
        comments={comments}
        minecraftUsername={user.minecraftUsername}
      />
    </div>
  );
}
