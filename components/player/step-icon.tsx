"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";

interface StepIconProps {
  done: boolean;
  current?: boolean;
}

export function StepIcon({ done, current }: StepIconProps) {
  if (done) {
    return <CheckCircle weight="fill" className="text-primary size-5" />;
  }

  if (current) {
    return <Circle weight="bold" className="text-primary size-5" />;
  }

  return <Circle className="text-muted-foreground size-5" />;
}
