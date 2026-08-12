import { cn } from "@/lib/utils";
import { MAX_SKILL_POINTS, SKILL_DEFINITIONS, type SkillValues } from "@/lib/character-sheet";
import { CharacterSheetStatus, type Gender } from "@/lib/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { AtlasSheetReviewActions } from "@/components/dashboard/atlas-sheet-review-actions";

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
  pseudo,
  canReview,
}: {
  sheet: CharacterSheetSummaryData | null;
  pseudo: string;
  canReview: boolean;
}) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Fiche personnage
        </span>
        {sheet && canReview && (
          <AtlasSheetReviewActions
            sheetId={sheet.id}
            pseudo={pseudo}
            reviewStatus={sheet.reviewStatus}
          />
        )}
      </div>

      {sheet ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {buildCivilFieldEntries(sheet).map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">{entry.label}</span>
                <p className="text-sm">{entry.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Description</span>
              <p className="text-xs whitespace-pre-wrap">{sheet.description}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Histoire</span>
              <p className="text-xs whitespace-pre-wrap">{sheet.background}</p>
            </div>
            {sheet.additionalComments && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs">Commentaires additionnels</span>
                <p className="text-xs whitespace-pre-wrap">{sheet.additionalComments}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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
