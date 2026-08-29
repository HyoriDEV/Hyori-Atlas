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
    <TableRow onClick={() => router.push(href)} className={cn("cursor-pointer", className)}>
      {children}
    </TableRow>
  );
}
