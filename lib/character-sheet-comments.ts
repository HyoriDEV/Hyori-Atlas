import { CharacterSheetCommentTarget } from "@/lib/generated/prisma/enums";
import type { TextAnchor } from "@/lib/text-anchor";

export const COMMENT_BODY_MAX_LENGTH = 1000;

export const commentTargetLabels: Record<CharacterSheetCommentTarget, string> = {
  [CharacterSheetCommentTarget.name]: "Nom RP",
  [CharacterSheetCommentTarget.nickname]: "Surnom",
  [CharacterSheetCommentTarget.age]: "Âge",
  [CharacterSheetCommentTarget.gender]: "Genre",
  [CharacterSheetCommentTarget.civilStatus]: "Statut",
  [CharacterSheetCommentTarget.heightCm]: "Taille",
  [CharacterSheetCommentTarget.description]: "Description",
  [CharacterSheetCommentTarget.background]: "Histoire",
  [CharacterSheetCommentTarget.additionalComments]: "Commentaires additionnels",
  [CharacterSheetCommentTarget.skillMap]: "Carte de compétences",
};

export const narrativeCommentTargets: CharacterSheetCommentTarget[] = [
  CharacterSheetCommentTarget.description,
  CharacterSheetCommentTarget.background,
];

export function isNarrativeCommentTarget(target: CharacterSheetCommentTarget): boolean {
  return narrativeCommentTargets.includes(target);
}

export interface SheetCommentInput {
  target: CharacterSheetCommentTarget;
  body: string;
  anchor: TextAnchor | null;
}

export interface SheetComment extends SheetCommentInput {
  id: string;
  authorName: string | null;
  createdAt: string | null;
}
