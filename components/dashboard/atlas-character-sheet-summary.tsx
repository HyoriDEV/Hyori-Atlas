import { cn } from "@/lib/utils";
import {
  MAX_SKILL_POINTS,
  SKILL_DEFINITIONS,
  truncateAtWordBoundary,
  type SkillValues,
} from "@/lib/character-sheet";
import { CharacterSheetStatus, type Gender } from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels } from "@/lib/navigation";
import { characterSheetStatusBadgeVariant } from "@/lib/atlas-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AtlasEvaluateSheetButton } from "@/components/dashboard/atlas-evaluate-sheet-button";
import { AtlasReopenSheetButton } from "@/components/dashboard/atlas-reopen-sheet-button";

interface CharacterSheetSummaryData extends SkillValues {
  id: string;
  name: string;
  nickname: string | null;
  age: number;
  gender: Gender;
  civilStatus: string;
  heightMeters: number;
  description: string;
  background: string;
  additionalComments: string | null;
  reviewStatus: CharacterSheetStatus;
}

const skillPoints = Array.from({ length: MAX_SKILL_POINTS }, (_, index) => index + 1);

const EXCERPT_MAX_LENGTH = 280;

function buildCivilFieldEntries(sheet: CharacterSheetSummaryData) {
  const heightCm =
    sheet.heightMeters > 10 ? Math.round(sheet.heightMeters) : Math.round(sheet.heightMeters * 100);

  return [
    { label: "Nom", value: sheet.name },
    { label: "Surnom", value: sheet.nickname ?? "—" },
    { label: "Âge", value: `${sheet.age} ans` },
    { label: "Genre", value: sheet.gender },
    { label: "Statut", value: sheet.civilStatus },
    { label: "Taille", value: `${heightCm} cm` },
  ];
}

export function AtlasCharacterSheetSummary({
  sheet,
  playerId,
  pseudo,
  canReview,
}: {
  sheet: CharacterSheetSummaryData | null;
  playerId: string;
  pseudo?: string;
  canReview: boolean;
}) {
  const isValidated = sheet?.reviewStatus === CharacterSheetStatus.VALIDATED;

  return (
    <Card className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Fiche personnage
          </span>
          {sheet && (
            <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}>
              {characterSheetStatusLabels[sheet.reviewStatus]}
            </Badge>
          )}
        </div>
        {sheet && (
          <div className="flex items-center gap-2">
            {canReview && isValidated && (
              <AtlasReopenSheetButton sheetId={sheet.id} pseudo={pseudo ?? sheet.name} />
            )}
            {canReview && sheet.reviewStatus === CharacterSheetStatus.PENDING_STAFF ? (
              <AtlasEvaluateSheetButton playerId={playerId} label="Évaluer la fiche personnage" />
            ) : (
              <AtlasEvaluateSheetButton playerId={playerId} label="Lire la fiche personnage" />
            )}
          </div>
        )}
      </div>

      {sheet ? (
        <>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {buildCivilFieldEntries(sheet).map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">{entry.label}</span>
                <p className="text-sm">{entry.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Description</span>
              <p className="text-justify text-xs whitespace-pre-wrap">
                {truncateAtWordBoundary(sheet.description, EXCERPT_MAX_LENGTH)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Histoire</span>
              <p className="text-justify text-xs whitespace-pre-wrap">
                {truncateAtWordBoundary(sheet.background, EXCERPT_MAX_LENGTH)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Commentaires additionnels</span>
              <p
                className={cn(
                  "text-justify text-xs whitespace-pre-wrap",
                  !sheet.additionalComments?.trim() && "text-muted-foreground"
                )}
              >
                {sheet.additionalComments?.trim()
                  ? truncateAtWordBoundary(sheet.additionalComments, EXCERPT_MAX_LENGTH)
                  : "Aucun commentaire écrit par le joueur."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
            {SKILL_DEFINITIONS.map((skill) => (
              <div key={skill.field} className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs">{skill.label}</span>
                <div className="flex gap-1">
                  {skillPoints.map((point) => (
                    <div
                      key={point}
                      className={cn(
                        "size-2.5 rounded-xs",
                        point <= sheet[skill.field] ? "bg-primary" : "border-border border"
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Ce joueur n&apos;a pas encore rempli sa fiche personnage.
        </p>
      )}
    </Card>
  );
}
