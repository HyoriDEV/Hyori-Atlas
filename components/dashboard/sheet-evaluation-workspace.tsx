"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { submitCharacterSheetEvaluation } from "@/lib/actions/staff-review-actions";
import type { SkillValues } from "@/lib/character-sheet";
import type { SheetComment } from "@/lib/character-sheet-comments";
import { CharacterSheetCommentTarget, CharacterSheetStatus } from "@/lib/generated/prisma/enums";
import { createTextAnchor, resolveTextAnchor, type HighlightRange } from "@/lib/text-anchor";
import { Card, CardContent } from "@/components/ui/card";
import {
  CharacterSheetFields,
  type CharacterSheetFieldValues,
} from "@/components/character-sheet/character-sheet-fields";
import { HighlightableText } from "@/components/character-sheet/highlightable-text";
import { SkillMap } from "@/components/character-sheet/skill-map";
import {
  commentTargetElementId,
  useCommentTargetScroll,
} from "@/components/character-sheet/use-comment-target-scroll";
import {
  SheetEvaluationSidebar,
  type CommentComposer,
} from "@/components/dashboard/sheet-evaluation-sidebar";

export function SheetEvaluationWorkspace({
  sheetId,
  playerId,
  pseudo,
  status,
  sheetUpdatedAt,
  fieldValues,
  skillValues,
  initialComments,
}: {
  sheetId: string;
  playerId: string;
  pseudo: string;
  status: CharacterSheetStatus;
  sheetUpdatedAt: string;
  fieldValues: CharacterSheetFieldValues;
  skillValues: SkillValues;
  initialComments: SheetComment[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [composer, setComposer] = useState<CommentComposer | null>(null);
  const [composerBody, setComposerBody] = useState("");
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeComment = comments.find((comment) => comment.id === activeCommentId) ?? null;
  useCommentTargetScroll(activeComment?.target ?? null);

  const canEvaluate = status === CharacterSheetStatus.PENDING_STAFF;

  function narrativeValue(target: CharacterSheetCommentTarget): string {
    return target === CharacterSheetCommentTarget.description
      ? fieldValues.description
      : fieldValues.background;
  }

  const { rangesByTarget, orphanedCommentIds } = useMemo(() => {
    const ranges: Partial<Record<CharacterSheetCommentTarget, HighlightRange[]>> = {};
    const orphaned: string[] = [];

    for (const comment of comments) {
      if (!comment.anchor) continue;

      const text =
        comment.target === CharacterSheetCommentTarget.description
          ? fieldValues.description
          : fieldValues.background;
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
  }, [comments, fieldValues.description, fieldValues.background]);

  function openComposer(target: CharacterSheetCommentTarget, anchor: CommentComposer["anchor"]) {
    if (!canEvaluate) return;
    setComposer({ target, anchor });
    setComposerBody("");
    setActiveCommentId(null);
  }

  function handleAddComment() {
    if (!composer || !composerBody.trim() || !canEvaluate) return;

    setComments((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        target: composer.target,
        body: composerBody.trim(),
        anchor: composer.anchor,
        authorName: null,
        createdAt: null,
      },
    ]);
    setComposer(null);
    setComposerBody("");
  }

  function handleSubmit() {
    if (!canEvaluate) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitCharacterSheetEvaluation(
          sheetId,
          comments.map((comment) => ({
            target: comment.target,
            body: comment.body,
            anchor: comment.anchor,
          })),
          sheetUpdatedAt
        );
        router.push(`/dashboard/atlas/${playerId}`);
      } catch (submitError) {
        setIsApprovalDialogOpen(false);
        setError(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_minmax(340px,26rem)]">
      <div className="flex flex-col gap-6">
        <CharacterSheetFields
          values={fieldValues}
          commentedTargets={comments.map((comment) => comment.target)}
          activeTarget={activeComment?.target ?? null}
          onTargetClick={canEvaluate ? (target) => openComposer(target, null) : undefined}
          narrativeSlot={(target) => (
            <HighlightableText
              value={narrativeValue(target)}
              ranges={rangesByTarget[target] ?? []}
              activeCommentId={activeCommentId}
              onCommentClick={setActiveCommentId}
              onSelectRange={
                canEvaluate
                  ? (range) =>
                      openComposer(
                        target,
                        createTextAnchor(narrativeValue(target), range.start, range.end)
                      )
                  : undefined
              }
            />
          )}
        />

        <Card
          id={commentTargetElementId(CharacterSheetCommentTarget.skillMap)}
          onClick={
            canEvaluate ? () => openComposer(CharacterSheetCommentTarget.skillMap, null) : undefined
          }
          className={cn(
            canEvaluate && "hover:ring-primary/50 cursor-pointer",
            activeComment?.target === CharacterSheetCommentTarget.skillMap && "ring-primary",
            "transition-colors"
          )}
        >
          <CardContent>
            <SkillMap values={skillValues} />
          </CardContent>
        </Card>
      </div>

      <SheetEvaluationSidebar
        pseudo={pseudo}
        status={status}
        comments={comments}
        orphanedCommentIds={orphanedCommentIds}
        activeCommentId={activeCommentId}
        composer={composer}
        composerBody={composerBody}
        isPending={isPending}
        error={error}
        isApprovalDialogOpen={isApprovalDialogOpen}
        onComposerBodyChange={setComposerBody}
        onCancelComposer={() => setComposer(null)}
        onAddComment={handleAddComment}
        onSelectComment={setActiveCommentId}
        onDeleteComment={(commentId) =>
          setComments((previous) => previous.filter((comment) => comment.id !== commentId))
        }
        onSubmit={handleSubmit}
        onApprovalDialogChange={setIsApprovalDialogOpen}
      />
    </div>
  );
}
