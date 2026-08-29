"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import { buildHighlightSegments, type HighlightRange, type ResolvedRange } from "@/lib/text-anchor";

function readSelectionRange(container: HTMLElement): ResolvedRange | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const precedingRange = document.createRange();
  precedingRange.selectNodeContents(container);
  precedingRange.setEnd(range.startContainer, range.startOffset);

  const start = precedingRange.toString().length;
  const end = start + range.toString().length;

  return end > start ? { start, end } : null;
}

export function HighlightableText({
  value,
  ranges,
  activeCommentId,
  onSelectRange,
  onCommentClick,
  className,
}: {
  value: string;
  ranges: HighlightRange[];
  activeCommentId: string | null;
  onSelectRange?: (range: ResolvedRange) => void;
  onCommentClick?: (commentId: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const segments = buildHighlightSegments(value, ranges);

  return (
    <p
      ref={containerRef}
      className={cn("text-sm whitespace-pre-wrap", className)}
      onMouseUp={() => {
        const container = containerRef.current;
        if (!container || !onSelectRange) return;
        const selectedRange = readSelectionRange(container);
        if (selectedRange) onSelectRange(selectedRange);
      }}
    >
      {segments.length === 0
        ? "—"
        : segments.map((segment, index) =>
            segment.commentIds.length === 0 ? (
              <span key={index}>{segment.text}</span>
            ) : (
              <mark
                key={index}
                onClick={() => onCommentClick?.(segment.commentIds[0])}
                className={cn(
                  "rounded-xs text-inherit",
                  onCommentClick && "cursor-pointer",
                  activeCommentId && segment.commentIds.includes(activeCommentId)
                    ? "bg-primary/45 ring-primary ring-1"
                    : "bg-primary/20"
                )}
              >
                {segment.text}
              </mark>
            )
          )}
    </p>
  );
}
