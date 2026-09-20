import { cn } from "@/lib/utils";
import {
  MAX_SKILL_POINTS,
  SKILL_DEFINITIONS,
  truncateAtWordBoundary,
  type SkillValues,
} from "@/lib/character-sheet";
import {
  CharacterSheetStatus,
  CharacterStatus,
  type CharacterClass,
  type Gender,
} from "@/lib/generated/prisma/enums";
import { characterSheetStatusLabels } from "@/lib/navigation";
import { characterSheetStatusBadgeVariant } from "@/lib/atlas-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AtlasEvaluateSheetButton } from "@/components/dashboard/atlas-evaluate-sheet-button";
import { AtlasReopenSheetButton } from "@/components/dashboard/atlas-reopen-sheet-button";
import { CHARACTER_CLASSES } from "@/lib/character-classes";

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
  status: CharacterStatus;
  assignedClass?: CharacterClass | null;
  primaryClass?: { id: string; name: string } | null;
  primaryRole?: { id: string; name: string } | null;
  secondaryClass?: { id: string; name: string } | null;
  secondaryRole?: { id: string; name: string } | null;
  reviewStatus: CharacterSheetStatus;
}

const skillPoints = Array.from({ length: MAX_SKILL_POINTS }, (_, index) => index + 1);

const EXCERPT_MAX_LENGTH = 280;

function buildCivilFieldEntries(sheet: CharacterSheetSummaryData) {
  return [
    { label: "Nom", value: sheet.name },
    { label: "Surnom", value: sheet.nickname ?? "—" },
    { label: "Âge", value: `${sheet.age} ans` },
    { label: "Métier", value: sheet.civilStatus },
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
    <Card className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Fiche personnage
          </span>
          {sheet && (
            <div className="flex items-center gap-1.5">
              <Badge variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}>
                {characterSheetStatusLabels[sheet.reviewStatus]}
              </Badge>
            </div>
          )}
        </div>
        {sheet && (
          <div className="flex items-center gap-2">
            {canReview && isValidated && (
              <AtlasReopenSheetButton sheetId={sheet.id} pseudo={pseudo ?? sheet.name} />
            )}
            {isValidated ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      href={`/staff/writing/${playerId}?characterId=${sheet.id}`}
                      prefetch={false}
                    />
                  }
                >
                  Lire la narration
                </Button>
                <AtlasEvaluateSheetButton
                  playerId={playerId}
                  sheetId={sheet.id}
                  label="Lire la fiche"
                />
              </>
            ) : canReview && sheet.reviewStatus === CharacterSheetStatus.PENDING_STAFF ? (
              <AtlasEvaluateSheetButton playerId={playerId} sheetId={sheet.id} label="Évaluer" />
            ) : (
              <AtlasEvaluateSheetButton
                playerId={playerId}
                sheetId={sheet.id}
                label="Lire la fiche"
              />
            )}
          </div>
        )}
      </div>

      {sheet ? (
        <>
          {/* Identité & Affiliation */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {buildCivilFieldEntries(sheet).map((entry) => (
                <div key={entry.label} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">{entry.label}</span>
                  <p className="truncate text-sm font-semibold">{entry.value}</p>
                </div>
              ))}
            </div>

            {(sheet.primaryClass || sheet.assignedClass) && (
              <div className="border-border/50 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                {sheet.primaryClass ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">
                      Affiliation souhaitée :
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="border-border/70 bg-muted/30 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                        <span className="text-muted-foreground">1er choix :</span>
                        <span className="text-foreground font-semibold">
                          {sheet.primaryClass.name}
                        </span>
                        {sheet.primaryRole && (
                          <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                            {sheet.primaryRole.name}
                          </Badge>
                        )}
                      </div>
                      {sheet.secondaryClass && (
                        <div className="border-border/70 bg-muted/30 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                          <span className="text-muted-foreground">2e choix :</span>
                          <span className="text-foreground font-semibold">
                            {sheet.secondaryClass.name}
                          </span>
                          {sheet.secondaryRole && (
                            <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                              {sheet.secondaryRole.name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {sheet.assignedClass &&
                  (() => {
                    const assignedDef = CHARACTER_CLASSES.find((c) => c.id === sheet.assignedClass);
                    if (!assignedDef) return null;
                    const IconComponent = assignedDef.icon;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">Classe attribuée :</span>
                        <Badge
                          variant="secondary"
                          className="border-primary/40 bg-primary/10 text-primary gap-1.5 px-2.5 py-1 text-xs font-medium"
                        >
                          <IconComponent size={14} className="shrink-0" />
                          {assignedDef.singularLabel}
                        </Badge>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>

          {/* Description & Histoire */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Description
              </span>
              <p className="text-foreground/90 text-xs leading-relaxed whitespace-pre-wrap">
                {sheet.description?.trim() ? (
                  truncateAtWordBoundary(sheet.description, EXCERPT_MAX_LENGTH)
                ) : (
                  <span className="text-muted-foreground italic">
                    Aucune description renseignée.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Histoire
              </span>
              <p className="text-foreground/90 text-xs leading-relaxed whitespace-pre-wrap">
                {sheet.background?.trim() ? (
                  truncateAtWordBoundary(sheet.background, EXCERPT_MAX_LENGTH)
                ) : (
                  <span className="text-muted-foreground italic">Aucune histoire renseignée.</span>
                )}
              </p>
            </div>
          </div>

          {/* Compétences */}
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Compétences
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
              {SKILL_DEFINITIONS.map((skill) => (
                <div key={skill.field} className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground truncate text-xs">{skill.label}</span>
                  <div className="flex items-center gap-1">
                    {skillPoints.map((point) => (
                      <div
                        key={point}
                        className={cn(
                          "size-2.5 rounded-xs transition-colors",
                          point <= sheet[skill.field] ? "bg-primary" : "border-border border"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
