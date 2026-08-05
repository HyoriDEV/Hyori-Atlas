"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";

export function StepIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle weight="fill" className="text-primary size-5" />
  ) : (
    <Circle className="text-muted-foreground size-5" />
  );
}
