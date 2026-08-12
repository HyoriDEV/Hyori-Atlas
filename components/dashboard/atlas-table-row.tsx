"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";

import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AtlasTableRow({
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
      <TableCell className="text-muted-foreground w-8">
        <CaretRight className="size-3.5" />
      </TableCell>
    </TableRow>
  );
}
