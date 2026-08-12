"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  paramName?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  paramName = "page",
}: TablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalCount === 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
      <div>
        Affichage de <span className="font-medium text-foreground">{startItem}</span> à{" "}
        <span className="font-medium text-foreground">{endItem}</span> sur{" "}
        <span className="font-medium text-foreground">{totalCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-2">
          Page <span className="font-medium text-foreground">{currentPage}</span> sur{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          aria-label="Page précédente"
        >
          <CaretLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          aria-label="Page suivante"
        >
          <CaretRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
