"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setClientPagePref } from "@/lib/table-preferences";
import { DEFAULT_TICKET_VIEW, type TicketView } from "@/lib/ticket-list";

export interface TicketViewTab {
  value: TicketView;
  label: string;
  count: number;
}

export function TicketViewTabs({
  activeView,
  tabs,
  className,
}: {
  activeView: TicketView;
  tabs: TicketViewTab[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === DEFAULT_TICKET_VIEW) {
      params.delete("tab");
      setClientPagePref(pathname, { tab: undefined });
    } else {
      params.set("tab", value);
      setClientPagePref(pathname, { tab: value });
    }
    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  return (
    <Tabs value={activeView} onValueChange={handleValueChange} className={className}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label} ({tab.count})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
