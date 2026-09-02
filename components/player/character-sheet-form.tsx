"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveCharacterSheetDraft,
  submitCharacterSheet,
} from "@/lib/actions/character-sheet-actions";
import type { SheetComment } from "@/lib/character-sheet-comments";
import { CharacterSheetCommentTarget, CharacterSheetStatus } from "@/lib/generated/prisma/enums";
import { resolveTextAnchor, type HighlightRange } from "@/lib/text-anchor";
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
import { HighlightedTextarea } from "@/components/character-sheet/highlighted-textarea";
import { SkillMap } from "@/components/character-sheet/skill-map";
import {
  commentTargetElementId,
  useCommentTargetScroll,
} from "@/components/character-sheet/use-comment-target-scroll";
import { CharacterSheetFeedbackSidebar } from "@/components/player/character-sheet-feedback-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LockSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CharacterSheetForm({
  initialValues,
  initialSkills,
  editable,
  status,
  comments,
}: {
  initialValues: CharacterSheetFieldValues;
  initialSkills: SkillValues;
  editable: boolean;
  status: CharacterSheetStatus;
  comments: SheetComment[];
}) {
  const [fields, setFields] = useState<CharacterSheetFieldValues>(initialValues);
  const [skills, setSkills] = useState<SkillValues>(initialSkills);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeComment = comments.find((comment) => comment.id === activeCommentId) ?? null;
  useCommentTargetScroll(activeComment?.target ?? null);

  const { rangesByTarget, orphanedCommentIds } = useMemo(() => {
    const ranges: Partial<Record<CharacterSheetCommentTarget, HighlightRange[]>> = {};
    const orphaned: string[] = [];

    for (const comment of comments) {
      if (!comment.anchor) continue;

      const text =
        comment.target === CharacterSheetCommentTarget.description
          ? fields.description
          : fields.background;
      const resolved = resolveTextAnchor(text, comment.anchor);

      if (!resolved) {
        orphaned.push(comment.id);
        continue;
      }

      ranges[comment.target] = [
        ...(ranges[comment.target] ?? []),
        { commentId: comment.id, ...resolved },
      ];
    }

    return { rangesByTarget: ranges, orphanedCommentIds: orphaned };
  }, [comments, fields.description, fields.background]);

  const age = parseInt(fields.age, 10);
  const heightCm = parseInt(fields.heightCm, 10);
  const total = sumSkillPoints(skills);

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
  const hasFeedback = comments.length > 0;

  function buildPayload() {
    return {
      name: fields.name,
      nickname: fields.nickname,
      age: Number.isInteger(age) ? age : 25,
      gender: fields.gender,
      civilStatus: fields.civilStatus,
      heightCm: Number.isInteger(heightCm) ? heightCm : 175,
      description: fields.description,
      background: fields.background,
      additionalComments: fields.additionalComments,
      skills,
    };
  }

  function handleSaveDraft() {
    setError(null);
    startTransition(async () => {
      try {
        await saveCharacterSheetDraft(buildPayload());
        toast.success("Brouillon enregistré avec succès.");
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Une erreur est survenue.";
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleSubmit() {
    if (!isValid) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitCharacterSheet(buildPayload());
        toast.success("Fiche personnage soumise pour relecture.");
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Une erreur est survenue.";
        setError(message);
        toast.error(message);
      }
    });
  }

  const pendingStaffNotice = !editable && status === CharacterSheetStatus.PENDING_STAFF && (
    <Card className="bg-primary/10 border-primary/20 text-foreground gap-1 p-4">
      <p>
        Ta fiche personnage a été transmise à l&apos;équipe, et est en relecture. Tu pourras la
        modifier si des changements sont demandés.
      </p>
    </Card>
  );

  const showSidebar = hasFeedback || (!editable && status === CharacterSheetStatus.PENDING_STAFF);

  const sheet = (
    <div className="flex flex-col gap-6">
      {!editable &&
        status === CharacterSheetStatus.PENDING_STAFF &&
        !showSidebar &&
        pendingStaffNotice}

      {!editable && status === CharacterSheetStatus.VALIDATED && (
        <Card className="border-border bg-card flex flex-row items-center gap-2.5 p-4">
          <LockSimple className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Une fois ta fiche personnage validée, elle ne peut plus être modifiée.
          </p>
        </Card>
      )}

      <CharacterSheetFields
        values={fields}
        interactive={editable}
        onChange={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
        commentedTargets={comments.map((comment) => comment.target)}
        activeTarget={activeComment?.target ?? null}
        narrativeSlot={
          hasFeedback && editable
            ? (target, field) => (
                <HighlightedTextarea
                  id={field.key}
                  rows={field.rows}
                  className={field.className}
                  placeholder={field.placeholder}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  value={fields[field.key]}
                  ranges={rangesByTarget[target] ?? []}
                  activeCommentId={activeCommentId}
                  onChange={(event) =>
                    setFields((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              )
            : undefined
        }
      />
      <Card
        id={commentTargetElementId(CharacterSheetCommentTarget.skillMap)}
        className={cn(
          activeComment?.target === CharacterSheetCommentTarget.skillMap && "ring-primary"
        )}
      >
        <CardContent>
          <SkillMap
            values={skills}
            interactive={editable}
            onChange={(field, value) => setSkills((prev) => ({ ...prev, [field]: value }))}
          />
        </CardContent>
      </Card>
      {editable && (
        <div className="flex flex-col items-end justify-end gap-3 sm:flex-row sm:items-center">
          {!isValid && validationError && (
            <p className="text-muted-foreground text-right text-xs sm:text-sm">{validationError}</p>
          )}
          {error && <p className="text-destructive text-right text-sm">{error}</p>}
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isPending}>
            Enregistrer le brouillon
          </Button>
          <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <AlertDialogTrigger
              render={
                <Button type="button" disabled={isPending || !isValid}>
                  Soumettre la fiche
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Soumettre la fiche personnage</AlertDialogTitle>
                <AlertDialogDescription>
                  Une fois soumise, ta fiche sera transmise à l&apos;équipe pour évaluation et
                  verrouillée en attendant leur retour. Es-tu sûr de vouloir l&apos;envoyer ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isPending || !isValid}
                  onClick={() => {
                    setIsSubmitDialogOpen(false);
                    handleSubmit();
                  }}
                >
                  Soumettre
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );

  if (!showSidebar) {
    return sheet;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_minmax(300px,22rem)]">
      {sheet}
      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        {pendingStaffNotice}
        {hasFeedback && (
          <CharacterSheetFeedbackSidebar
            comments={comments}
            orphanedCommentIds={orphanedCommentIds}
            activeCommentId={activeCommentId}
            onSelectComment={setActiveCommentId}
            editable={editable}
          />
        )}
      </div>
    </div>
  );
}
