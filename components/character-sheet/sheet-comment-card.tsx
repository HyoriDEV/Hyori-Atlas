"use client";

import { TrashSimple } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { commentTargetLabels, type SheetComment } from "@/lib/character-sheet-comments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SheetCommentCard({
  comment,
  isActive,
  isOrphaned,
  onSelect,
  onDelete,
}: {
  comment: SheetComment;
  isActive: boolean;
  isOrphaned: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "bg-card/50 flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
        isActive ? "border-primary bg-primary/5" : "hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="inverted">{commentTargetLabels[comment.target]}</Badge>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Supprimer le commentaire"
            aria-label="Supprimer le commentaire"
            className="text-destructive hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <TrashSimple className="size-3.5" />
          </Button>
        )}
      </div>

      {comment.anchor &&
        (isOrphaned ? (
          <span className="text-muted-foreground text-xs italic">
            Passage modifié depuis le commentaire.
          </span>
        ) : (
          <p className="text-muted-foreground border-primary/40 border-l-2 pl-2 text-xs italic">
            «&nbsp;{comment.anchor.quotedText}&nbsp;»
          </p>
        ))}

      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>

      {comment.authorName && (
        <span className="text-muted-foreground text-xs">
          {comment.authorName}
          {comment.createdAt &&
            ` • ${formatDate(comment.createdAt, { style: "prefix-long", withTime: true })}`}
        </span>
      )}
    </div>
  );
}
