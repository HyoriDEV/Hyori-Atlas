"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface StatusTabsProps {
  activeTab: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  activeLabel?: string;
  archivedLabel?: string;
  variant?: "default" | "line";
  className?: string;
  children?: React.ReactNode;
}

export function StatusTabs({
  activeTab,
  activeCount,
  archivedCount,
  activeLabel = "Actifs",
  archivedLabel = "Archivés",
  variant = "line",
  className,
  children,
}: StatusTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "archived") {
      params.set("tab", "archived");
    } else {
      params.delete("tab");
    }
    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange} className={className}>
      <TabsList variant={variant}>
        <TabsTrigger value="active">
          {activeLabel} ({activeCount})
        </TabsTrigger>
        <TabsTrigger value="archived">
          {archivedLabel} ({archivedCount})
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
