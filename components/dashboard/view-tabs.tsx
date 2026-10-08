"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  className,
}: {
  activeView: T;
  /** Vue affichée sans paramètre d'URL : elle n'est jamais écrite dans l'URL ni les préférences. */
  defaultView: T;
  tabs: ViewTab<T>[];
  paramName?: string;
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

  return (
    <Tabs value={activeView} onValueChange={handleValueChange} className={className}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.count === undefined ? tab.label : `${tab.label} (${tab.count})`}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
