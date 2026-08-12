"use client";

import { useState, useTransition } from "react";

import { upsertCharacterSheet } from "@/lib/actions/character-sheet-actions";
import {
  ADDITIONAL_COMMENTS_MAX_LENGTH,
  AGE_MAX,
  AGE_MIN,
  BACKGROUND_MAX_LENGTH,
  BACKGROUND_MIN_LENGTH,
  CIVIL_STATUS_MAX_LENGTH,
  CIVIL_STATUS_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  HEIGHT_MAX,
  HEIGHT_MIN,
  MAX_TOTAL_SKILL_POINTS,
  MIN_TOTAL_SKILL_POINTS,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  SKILL_DEFINITIONS,
  isSkillValueValid,
  sumSkillPoints,
  type SkillValues,
} from "@/lib/character-sheet";
import {
  CharacterSheetFields,
  type CharacterSheetFieldValues,
} from "@/components/character-sheet/character-sheet-fields";
import { SkillMap } from "@/components/character-sheet/skill-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CharacterSheetForm({
  initialValues,
  initialSkills,
  editable,
}: {
  initialValues: CharacterSheetFieldValues;
  initialSkills: SkillValues;
  editable: boolean;
}) {
  const [fields, setFields] = useState(initialValues);
  const [skills, setSkills] = useState(initialSkills);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = sumSkillPoints(skills);
  const age = Number(fields.age);
  const heightCm = Number(fields.heightCm);

  const nameLength = fields.name.trim().length;
  const nicknameLength = fields.nickname.trim().length;
  const civilStatusLength = fields.civilStatus.trim().length;
  const descriptionLength = fields.description.trim().length;
  const backgroundLength = fields.background.trim().length;
  const additionalCommentsLength = fields.additionalComments.trim().length;

  function getValidationError(): string | null {
    if (nameLength === 0) return "Le nom RP est requis.";
    if (nameLength < NAME_MIN_LENGTH || nameLength > NAME_MAX_LENGTH)
      return `Le nom RP doit contenir entre ${NAME_MIN_LENGTH} et ${NAME_MAX_LENGTH} caractères.`;

    if (nicknameLength > NICKNAME_MAX_LENGTH)
      return `Le surnom dépasse ${NICKNAME_MAX_LENGTH} caractères.`;

    if (!fields.gender.trim()) return "Veuillez sélectionner un genre.";

    if (civilStatusLength === 0) return "Le statut est requis.";
    if (civilStatusLength < CIVIL_STATUS_MIN_LENGTH || civilStatusLength > CIVIL_STATUS_MAX_LENGTH)
      return `Le statut doit contenir entre ${CIVIL_STATUS_MIN_LENGTH} et ${CIVIL_STATUS_MAX_LENGTH} caractères.`;

    if (!fields.age || !Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX)
      return `L'âge doit être compris entre ${AGE_MIN} et ${AGE_MAX} ans.`;

    if (
      !fields.heightCm ||
      !Number.isInteger(heightCm) ||
      heightCm < HEIGHT_MIN ||
      heightCm > HEIGHT_MAX
    )
      return `La taille doit être comprise entre ${HEIGHT_MIN}cm et ${HEIGHT_MAX}cm.`;

    if (descriptionLength === 0) return "La description est requise.";
    if (descriptionLength < DESCRIPTION_MIN_LENGTH)
      return `La description doit contenir au moins ${DESCRIPTION_MIN_LENGTH} caractères.`;
    if (descriptionLength > DESCRIPTION_MAX_LENGTH)
      return `La description dépasse ${DESCRIPTION_MAX_LENGTH} caractères.`;

    if (backgroundLength === 0) return "L'histoire est requise.";
    if (backgroundLength < BACKGROUND_MIN_LENGTH)
      return `L'histoire doit contenir au moins ${BACKGROUND_MIN_LENGTH} caractères.`;
    if (backgroundLength > BACKGROUND_MAX_LENGTH)
      return `L'histoire dépasse ${BACKGROUND_MAX_LENGTH} caractères.`;

    if (additionalCommentsLength > ADDITIONAL_COMMENTS_MAX_LENGTH)
      return `Les commentaires additionnels dépassent ${ADDITIONAL_COMMENTS_MAX_LENGTH} caractères.`;

    for (const skill of SKILL_DEFINITIONS) {
      if (!isSkillValueValid(skills[skill.field]))
        return `La compétence ${skill.label} doit être comprise entre 1 et 5.`;
    }

    if (total < MIN_TOTAL_SKILL_POINTS)
      return `Attribue au moins ${MIN_TOTAL_SKILL_POINTS} points de compétences.`;

    if (total > MAX_TOTAL_SKILL_POINTS)
      return `Attribue au plus ${MAX_TOTAL_SKILL_POINTS} points de compétences.`;

    return null;
  }

  const validationError = getValidationError();
  const isValid = validationError === null;

  function handleSubmit() {
    if (!isValid) return;
    setError(null);
    startTransition(async () => {
      try {
        await upsertCharacterSheet({
          name: fields.name,
          nickname: fields.nickname,
          age,
          gender: fields.gender,
          civilStatus: fields.civilStatus,
          heightCm,
          description: fields.description,
          background: fields.background,
          additionalComments: fields.additionalComments,
          skills,
        });
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <CharacterSheetFields
        values={fields}
        interactive={editable}
        onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
      />
      <Card>
        <CardContent>
          <SkillMap
            values={skills}
            interactive={editable}
            onChange={(field, value) => setSkills((prev) => ({ ...prev, [field]: value }))}
          />
        </CardContent>
      </Card>
      {editable && (
        <div className="flex flex-col items-end gap-2">
          {error && <p className="text-destructive text-right text-sm">{error}</p>}
          <div className="flex flex-col items-end justify-end gap-3 sm:flex-row sm:items-center">
            {!isValid && validationError && (
              <p className="text-muted-foreground text-right text-xs sm:text-sm">
                {validationError}
              </p>
            )}
            <Button type="button" onClick={handleSubmit} disabled={isPending || !isValid}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
