"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setClientPagePref } from "@/lib/table-preferences";

export interface ViewTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function ViewTabs<T extends string>({
  activeView,
  defaultView,
  tabs,
  paramName = "tab",
  mobileSelect = false,
  className,
}: {
  activeView: T;
  /** Vue affichée sans paramètre d'URL : elle n'est jamais écrite dans l'URL ni les préférences. */
  defaultView: T;
  tabs: ViewTab<T>[];
  paramName?: string;
  /** Sur téléphone (sous `sm`), affiche un menu déroulant à la place des onglets. */
  mobileSelect?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultView) {
      params.delete(paramName);
      setClientPagePref(pathname, { [paramName]: undefined });
    } else {
      params.set(paramName, value);
      setClientPagePref(pathname, { [paramName]: value });
    }
    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  const tabLabel = (tab: ViewTab<T>) =>
    tab.count === undefined ? tab.label : `${tab.label} (${tab.count})`;

  const tabsBar = (
    <Tabs
      value={activeView}
      onValueChange={handleValueChange}
      className={cn("max-w-full min-w-0", className)}
    >
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tabLabel(tab)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  if (!mobileSelect) return tabsBar;

  const items = tabs.map((tab) => ({ value: tab.value, label: tabLabel(tab) }));

  return (
    <>
      <div className={cn("sm:hidden", className)}>
        <Select
          items={items}
          value={activeView}
          onValueChange={(value) => {
            if (value) handleValueChange(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {items.find((item) => item.value === activeView)?.label ?? ""}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden sm:block">{tabsBar}</div>
    </>
  );
}
