"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function TicketTableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest("a, button")) {
          return;
        }
        router.push(href);
      }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </TableRow>
  );
}
