"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FloppyDisk } from "@phosphor-icons/react";

import { updateCharacterSheetAsStaff } from "@/lib/actions/staff-character-actions";
import {
  ADDITIONAL_COMMENTS_MAX_LENGTH,
  AGE_MAX,
  AGE_MIN,
  CIVIL_STATUS_MAX_LENGTH,
  CIVIL_STATUS_MIN_LENGTH,
  HEIGHT_MAX,
  HEIGHT_MIN,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  SKILL_DEFINITIONS,
  isSkillValueValid,
  type SkillValues,
} from "@/lib/character-sheet";
import {
  CivilFieldsCard,
  NarrativeFieldsCard,
  type CharacterSheetFieldValues,
} from "@/components/character-sheet/character-sheet-fields";
import {
  AffiliationCard,
  type AffiliationChoiceValues,
} from "@/components/character-sheet/affiliation-fields";
import type { PlayerClassWithStats } from "@/lib/role-balance";
import { SkillMap } from "@/components/character-sheet/skill-map";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function StaffCharacterSheetEditForm({
  sheetId,
  playerId,
  pseudo,
  initialValues,
  initialSkills,
  playerClasses = [],
  initialAffiliation,
  children,
}: {
  sheetId: string;
  playerId: string;
  pseudo: string;
  initialValues: CharacterSheetFieldValues;
  initialSkills: SkillValues;
  playerClasses?: PlayerClassWithStats[];
  initialAffiliation?: AffiliationChoiceValues;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<CharacterSheetFieldValues>(initialValues);
  const [skills, setSkills] = useState<SkillValues>(initialSkills);
  const [affiliation, setAffiliation] = useState<AffiliationChoiceValues>(
    initialAffiliation ?? {
      primaryClassId: null,
      primaryRoleId: null,
      secondaryClassId: null,
      secondaryRoleId: null,
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const age = parseInt(fields.age, 10);
  const heightCm = parseInt(fields.heightCm, 10);

  function getValidationError(): string | null {
    const nameLength = fields.name.trim().length;
    const nicknameLength = fields.nickname.trim().length;
    const civilStatusLength = fields.civilStatus.trim().length;
    const descriptionLength = fields.description.trim().length;
    const backgroundLength = fields.background.trim().length;
    const additionalCommentsLength = fields.additionalComments.trim().length;

    if (nameLength === 0) return "Le nom est requis.";
    if (nameLength < NAME_MIN_LENGTH)
      return `Le nom doit contenir au moins ${NAME_MIN_LENGTH} caractères.`;
    if (nameLength > NAME_MAX_LENGTH) return `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`;

    if (nicknameLength > NICKNAME_MAX_LENGTH)
      return `Le surnom dépasse ${NICKNAME_MAX_LENGTH} caractères.`;

    if (fields.gender.trim().length === 0) return "Choisis un genre.";

    if (civilStatusLength === 0) return "Le statut civil est requis.";
    if (civilStatusLength < CIVIL_STATUS_MIN_LENGTH)
      return `Le statut civil doit contenir au moins ${CIVIL_STATUS_MIN_LENGTH} caractères.`;
    if (civilStatusLength > CIVIL_STATUS_MAX_LENGTH)
      return `Le statut civil dépasse ${CIVIL_STATUS_MAX_LENGTH} caractères.`;

    if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX)
      return `L'âge doit être compris entre ${AGE_MIN} et ${AGE_MAX} ans.`;

    if (!Number.isInteger(heightCm) || heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX)
      return `La taille doit être comprise entre ${HEIGHT_MIN}cm et ${HEIGHT_MAX}cm.`;

    if (descriptionLength > 2000) return "La description dépasse 2000 caractères.";

    if (backgroundLength > 2000) return "L'histoire dépasse 2000 caractères.";

    if (additionalCommentsLength > ADDITIONAL_COMMENTS_MAX_LENGTH)
      return `Le champ « Membres de ton groupe RP » dépasse ${ADDITIONAL_COMMENTS_MAX_LENGTH} caractères.`;

    for (const skill of SKILL_DEFINITIONS) {
      if (!isSkillValueValid(skills[skill.field]))
        return `La compétence ${skill.label} doit être comprise entre 1 et 5.`;
    }

    if (
      affiliation.primaryClassId &&
      affiliation.secondaryClassId &&
      affiliation.primaryClassId === affiliation.secondaryClassId
    ) {
      return "Le deuxième choix d'affiliation doit être une classe différente du premier choix.";
    }

    return null;
  }

  const isValid = getValidationError() === null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errorMsg = getValidationError();
    if (errorMsg) {
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updateCharacterSheetAsStaff(sheetId, {
          name: fields.name,
          nickname: fields.nickname || null,
          age: Number.isInteger(age) ? age : 25,
          gender: fields.gender,
          civilStatus: fields.civilStatus,
          heightCm: Number.isInteger(heightCm) ? heightCm : 175,
          description: fields.description,
          background: fields.background,
          additionalComments: fields.additionalComments || null,
          primaryClassId: affiliation.primaryClassId,
          primaryRoleId: affiliation.primaryRoleId,
          secondaryClassId: affiliation.secondaryClassId,
          secondaryRoleId: affiliation.secondaryRoleId,
          skills,
        });

        toast.success("Fiche personnage modifiée avec succès.");
        router.push(`/staff/atlas/${playerId}?sheetId=${sheetId}`);
        router.refresh();
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Une erreur est survenue.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* En-tête de la page */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AtlasBackButton href={`/staff/atlas/${playerId}?sheetId=${sheetId}`} />
          <div className="flex flex-col">
            <h1 className="font-heading text-lg font-semibold">
              Édition : {fields.name || "Fiche sans nom"}
            </h1>
            <span className="text-muted-foreground text-xs">Joueur : {pseudo}</span>
          </div>
        </div>

        {/* Boutons d'action en haut à droite */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link href={`/staff/atlas/${playerId}?sheetId=${sheetId}`} prefetch={false} />}
          >
            Annuler
          </Button>

          <Button type="submit" size="sm" disabled={!isValid || isPending} className="gap-2">
            <FloppyDisk size={16} />
            {isPending ? "Enregistrement en cours..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {children}

      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border p-3 text-sm">
          {error}
        </div>
      )}

      {/* Grille du formulaire */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Colonne gauche (1/3) : Informations civiles + Affiliation */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <CivilFieldsCard
            values={fields}
            interactive={true}
            onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
          />

          <AffiliationCard
            playerClasses={playerClasses}
            values={affiliation}
            interactive={true}
            onChange={setAffiliation}
          />
        </div>

        {/* Colonne droite (2/3) : Personnage + Carte de compétences */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <NarrativeFieldsCard
            values={fields}
            interactive={true}
            onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
          />

          <Card>
            <CardContent>
              <SkillMap
                values={skills}
                interactive={true}
                onChange={(field, value) => setSkills((prev) => ({ ...prev, [field]: value }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
