"use client";

import { useEffect } from "react";

import type { CharacterSheetCommentTarget } from "@/lib/generated/prisma/enums";

export function commentTargetElementId(target: CharacterSheetCommentTarget): string {
  return `sheet-target-${target}`;
}

export function useCommentTargetScroll(activeTarget: CharacterSheetCommentTarget | null) {
  useEffect(() => {
    if (!activeTarget) return;
    document
      .getElementById(commentTargetElementId(activeTarget))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTarget]);
}
