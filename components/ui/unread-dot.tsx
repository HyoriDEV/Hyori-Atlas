import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const unreadDotVariants = cva("rounded-full select-none", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
    },
    placement: {
      table: "absolute left-2.5 top-1/2 -translate-y-1/2 size-2",
      card: "absolute -left-1 top-1/2 -translate-y-1/2 size-2 shadow-xs",
      inline: "size-2 shrink-0",
    },
    pulse: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    placement: "inline",
    pulse: false,
  },
});

export interface UnreadDotProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof unreadDotVariants> {}

export function UnreadDot({
  className,
  variant,
  placement,
  pulse,
  title,
  ...props
}: UnreadDotProps) {
  return (
    <span
      className={cn(unreadDotVariants({ variant, placement, pulse }), className)}
      title={title}
      aria-label={title}
      {...props}
    />
  );
}
