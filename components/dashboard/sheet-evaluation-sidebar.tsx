"use client";

import {
  COMMENT_BODY_MAX_LENGTH,
  commentTargetLabels,
  type SheetComment,
} from "@/lib/character-sheet-comments";
import {
  CharacterSheetStatus,
  type CharacterSheetCommentTarget,
} from "@/lib/generated/prisma/enums";
import type { TextAnchor } from "@/lib/text-anchor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SheetCommentCard } from "@/components/character-sheet/sheet-comment-card";

export interface CommentComposer {
  target: CharacterSheetCommentTarget;
  anchor: TextAnchor | null;
}

export function SheetEvaluationSidebar({
  pseudo,
  status,
  comments,
  orphanedCommentIds,
  activeCommentId,
  composer,
  composerBody,
  isPending,
  error,
  isApprovalDialogOpen,
  onComposerBodyChange,
  onCancelComposer,
  onAddComment,
  onSelectComment,
  onDeleteComment,
  onSubmit,
  onApprovalDialogChange,
}: {
  pseudo: string;
  status: CharacterSheetStatus;
  comments: SheetComment[];
  orphanedCommentIds: string[];
  activeCommentId: string | null;
  composer: CommentComposer | null;
  composerBody: string;
  isPending: boolean;
  error: string | null;
  isApprovalDialogOpen: boolean;
  onComposerBodyChange: (body: string) => void;
  onCancelComposer: () => void;
  onAddComment: () => void;
  onSelectComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onSubmit: () => void;
  onApprovalDialogChange: (open: boolean) => void;
}) {
  const hasComments = comments.length > 0;
  const canEvaluate = status === CharacterSheetStatus.PENDING_STAFF;

  return (
    <Card className="flex max-h-[calc(100vh-6rem)] flex-col gap-4 lg:sticky lg:top-6">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {canEvaluate ? "Évaluation" : "Consultation"}
        </span>
        {canEvaluate && (
          <p className="text-muted-foreground text-xs">
            Clique sur un champ, sur la carte de compétences, ou sélectionne un extrait de texte
            pour laisser un commentaire.
          </p>
        )}
      </div>

      {status === CharacterSheetStatus.PENDING_PLAYER && (
        <div className="bg-secondary/70 text-secondary-foreground rounded-lg p-3 text-xs">
          Cette fiche est actuellement enregistrée comme brouillon par le joueur. Tu peux la
          consulter, mais l&apos;ajout de commentaires et la validation ne sont possibles
          qu&apos;une fois la fiche soumise pour relecture.
        </div>
      )}

      {canEvaluate && composer && (
        <div className="border-primary/50 flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">{commentTargetLabels[composer.target]}</span>
          {composer.anchor && (
            <p className="text-muted-foreground border-primary/40 border-l-2 pl-2 text-xs italic">
              «&nbsp;{composer.anchor.quotedText}&nbsp;»
            </p>
          )}
          <Textarea
            autoFocus
            rows={4}
            maxLength={COMMENT_BODY_MAX_LENGTH}
            placeholder="Explique ce qui doit être retravaillé..."
            value={composerBody}
            onChange={(event) => onComposerBodyChange(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancelComposer}>
              Annuler
            </Button>
            <Button type="button" size="sm" disabled={!composerBody.trim()} onClick={onAddComment}>
              Ajouter
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {hasComments ? (
          comments.map((comment) => (
            <SheetCommentCard
              key={comment.id}
              comment={comment}
              isActive={activeCommentId === comment.id}
              isOrphaned={orphanedCommentIds.includes(comment.id)}
              onSelect={() => onSelectComment(comment.id)}
              onDelete={canEvaluate ? () => onDeleteComment(comment.id) : undefined}
            />
          ))
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Aucun commentaire pour le moment.
          </p>
        )}
      </div>

      {canEvaluate && (
        <div className="flex flex-col gap-2">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={() => (hasComments ? onSubmit() : onApprovalDialogChange(true))}
          >
            {hasComments ? "Demander des modifications" : "Valider la fiche"}
          </Button>
        </div>
      )}

      <AlertDialog open={isApprovalDialogOpen} onOpenChange={onApprovalDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider la fiche</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche de <span className="text-foreground">{pseudo} </span>sera marquée comme
              validée et verrouillée pour le joueur. Elle pourra être rouverte par le staff en cas
              de besoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={onSubmit}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
