"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TicketsArchiveTabs({
  activeTab,
  activeCount,
  archivedCount,
  children,
}: {
  activeTab: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        router.push(value === "archived" ? `${pathname}?archived=1` : pathname);
      }}
    >
      <TabsList variant="line">
        <TabsTrigger value="active">Actifs ({activeCount})</TabsTrigger>
        <TabsTrigger value="archived">Archivés ({archivedCount})</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
