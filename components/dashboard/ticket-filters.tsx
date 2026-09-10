"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketCategory } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels } from "@/lib/navigation";
import { setClientPagePref } from "@/lib/table-preferences";

const ALL_VALUE = "ALL";

const categoryItems = [
  { value: ALL_VALUE, label: "Toutes les catégories" },
  ...Object.values(TicketCategory).map((value) => ({ value, label: ticketCategoryLabels[value] })),
];

export function TicketFilters({ category }: { category?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    const prefsToUpdate: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
        prefsToUpdate[key] = value;
      } else {
        params.delete(key);
        prefsToUpdate[key] = undefined;
      }
    }

    if (Object.keys(prefsToUpdate).length > 0) {
      setClientPagePref(pathname, prefsToUpdate);
    }

    params.set("page", "1");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={categoryItems}
        value={category ?? ALL_VALUE}
        onValueChange={(value) => updateParams({ category: value ?? ALL_VALUE })}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
