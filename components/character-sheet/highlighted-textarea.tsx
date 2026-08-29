"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import { buildHighlightSegments, type HighlightRange } from "@/lib/text-anchor";
import { Textarea } from "@/components/ui/textarea";

export const textareaMetricsClassName =
  "w-full rounded-md border px-2.5 py-2 text-sm whitespace-pre-wrap break-words md:text-xs/relaxed";

export function HighlightedTextarea({
  id,
  value,
  ranges,
  activeCommentId,
  className,
  ...textareaProps
}: React.ComponentProps<"textarea"> & {
  value: string;
  ranges: HighlightRange[];
  activeCommentId: string | null;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const segments = buildHighlightSegments(value, ranges);

  return (
    <div className="bg-input/20 dark:bg-input/30 relative rounded-md">
      <div
        ref={mirrorRef}
        aria-hidden
        className={cn(
          textareaMetricsClassName,
          "pointer-events-none absolute inset-0 overflow-hidden border-transparent text-transparent select-none"
        )}
      >
        {segments.map((segment, index) =>
          segment.commentIds.length === 0 ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <mark
              key={index}
              className={cn(
                "rounded-xs bg-transparent text-transparent",
                activeCommentId && segment.commentIds.includes(activeCommentId)
                  ? "bg-primary/45 ring-primary ring-1"
                  : "bg-primary/20"
              )}
            >
              {segment.text}
            </mark>
          )
        )}
        {"\n"}
      </div>
      <Textarea
        id={id}
        value={value}
        className={cn(
          textareaMetricsClassName,
          "relative bg-transparent dark:bg-transparent",
          className
        )}
        onScroll={(event) => {
          const mirror = mirrorRef.current;
          if (!mirror) return;
          mirror.scrollTop = event.currentTarget.scrollTop;
          mirror.scrollLeft = event.currentTarget.scrollLeft;
        }}
        {...textareaProps}
      />
    </div>
  );
}
