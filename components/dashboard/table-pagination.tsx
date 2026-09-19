"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setClientPagePref, DEFAULT_PAGE_SIZE_OPTIONS } from "@/lib/table-preferences";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  paramName?: string;
  sizeParamName?: string;
  pageSizeOptions?: readonly number[];
  showPageSizeSelector?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  paramName = "page",
  sizeParamName = "pageSize",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.max(1, currentPage);
  const startItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalCount);

  const pageSizeItems = React.useMemo(() => {
    return (pageSizeOptions ?? []).map((opt) => ({
      value: String(opt),
      label: String(opt),
    }));
  }, [pageSizeOptions]);

  function goToPage(page: number) {
    if (onPageChange) {
      onPageChange(page);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePageSizeChange(newSizeStr: string | null) {
    if (!newSizeStr) return;
    const newSize = parseInt(newSizeStr, 10);
    if (isNaN(newSize)) return;

    // Save user preference in cookie & localStorage
    setClientPagePref(pathname, { [sizeParamName]: newSize.toString() });

    if (onPageSizeChange) {
      onPageSizeChange(newSize);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set(sizeParamName, newSize.toString());
    // Reset to page 1 on page size change
    params.set(paramName, "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          Affichage de <span className="text-foreground font-medium">{startItem}</span> à{" "}
          <span className="text-foreground font-medium">{endItem}</span> sur{" "}
          <span className="text-foreground font-medium">{totalCount}</span>
        </div>

        {showPageSizeSelector && pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <span>Résultats/page</span>
            <Select
              items={pageSizeItems}
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger size="sm" className="h-7 min-w-[62px] px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {pageSizeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-2">
          Page <span className="text-foreground font-medium">{safeCurrentPage}</span> sur{" "}
          <span className="text-foreground font-medium">{safeTotalPages}</span>
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={safeCurrentPage <= 1}
          onClick={() => goToPage(safeCurrentPage - 1)}
          aria-label="Page précédente"
        >
          <CaretLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => goToPage(safeCurrentPage + 1)}
          aria-label="Page suivante"
        >
          <CaretRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
