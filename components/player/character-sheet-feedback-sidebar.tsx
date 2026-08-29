"use client";

import type { SheetComment } from "@/lib/character-sheet-comments";
import { Card } from "@/components/ui/card";
import { SheetCommentCard } from "@/components/character-sheet/sheet-comment-card";

export function CharacterSheetFeedbackSidebar({
  comments,
  orphanedCommentIds,
  activeCommentId,
  onSelectComment,
  editable = true,
}: {
  comments: SheetComment[];
  orphanedCommentIds: string[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string) => void;
  editable?: boolean;
}) {
  return (
    <Card className="flex max-h-[calc(100vh-6rem)] flex-col gap-4 lg:sticky lg:top-6">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Retours du staff
        </span>
        <p className="text-muted-foreground text-xs">
          {editable
            ? "Clique sur un retour pour mettre en évidence l'élément concerné. Ta fiche reste modifiable jusqu'à ce que tu la soumettes à nouveau."
            : "Clique sur un retour pour mettre en évidence l'élément concerné."}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {comments.map((comment) => (
          <SheetCommentCard
            key={comment.id}
            comment={comment}
            isActive={activeCommentId === comment.id}
            isOrphaned={orphanedCommentIds.includes(comment.id)}
            onSelect={() => onSelectComment(comment.id)}
          />
        ))}
      </div>
    </Card>
  );
}
