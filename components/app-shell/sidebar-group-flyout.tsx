"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CaretRight, LockSimple } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { NavIconKey } from "@/lib/navigation";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { AppShellNavEntry, AppShellNavGroup } from "@/components/app-shell/app-shell";

const defaultGroupIcons: Record<string, NavIconKey> = {
  Modération: "shield",
  Organisation: "kanban",
  "Gestion RP": "users",
  Admission: "clock",
  Contenu: "newspaper",
  Administration: "gear",
  Support: "chat",
  Roleplay: "pen",
  Inscription: "flag",
};

interface SidebarGroupFlyoutProps {
  group: AppShellNavGroup;
  pathname: string | null;
  countsOverride: Record<string, number>;
  iconMap: Record<NavIconKey, React.ComponentType<{ className?: string }>>;
}

export function SidebarGroupFlyout({
  group,
  pathname,
  countsOverride,
  iconMap,
}: SidebarGroupFlyoutProps) {
  const [open, setOpen] = useState(false);

  // Fermer la pop-up immédiatement lors d'une navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const groupTitle = group.title ?? "Groupe";
  const groupIconKey: NavIconKey =
    group.iconKey ?? defaultGroupIcons[groupTitle] ?? "squares-four";
  const GroupIcon = iconMap[groupIconKey] ?? iconMap["squares-four"];

  // Déterminer si le groupe contient la page actuellement active
  const isGroupActive = group.items.some((item) => {
    const isRoot = item.href === "/staff" || item.href === "/player";
    return isRoot ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);
  });

  // Somme totale des badges pour ce groupe
  const totalBadgeCount = group.items.reduce((acc, item) => {
    const count =
      typeof countsOverride[item.href] === "number"
        ? countsOverride[item.href]
        : item.badgeCount ?? 0;
    return acc + (count > 0 ? count : 0);
  }, 0);

  const hasGroupNotification =
    totalBadgeCount > 0 ||
    group.items.some(
      (item) => item.hasNotification && typeof countsOverride[item.href] !== "number"
    );

  return (
    <SidebarMenuItem className="relative">
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          openOnHover
          delay={70}
          closeDelay={220}
          nativeButton={false}
          render={
            <SidebarMenuButton
              isActive={isGroupActive}
              className={cn(
                "group/flyout-btn h-9 w-full cursor-pointer justify-between rounded-md px-2.5 transition-all duration-150 ease-out",
                isGroupActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                open && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            />
          }
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <GroupIcon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isGroupActive ? "text-primary" : "text-sidebar-foreground/70 group-hover/flyout-btn:text-sidebar-foreground"
              )}
            />
            <span className="truncate text-sm">{groupTitle}</span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {totalBadgeCount > 0 ? (
              <span className="bg-primary/15 text-primary flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums">
                {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
              </span>
            ) : hasGroupNotification ? (
              <span className="bg-primary size-2 rounded-full animate-pulse" />
            ) : null}
            <CaretRight
              className={cn(
                "text-sidebar-foreground/40 size-3.5 transition-transform duration-150",
                open ? "rotate-90 text-primary" : "group-hover/flyout-btn:translate-x-0.5 group-hover/flyout-btn:text-sidebar-foreground/70"
              )}
            />
          </div>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            side="right"
            align="start"
            sideOffset={10}
            alignOffset={-4}
            className="isolate z-50 outline-none"
          >
            <PopoverPrimitive.Popup
              className={cn(
                "border-border/80 bg-popover/95 text-popover-foreground z-50 flex w-64 origin-(--transform-origin) flex-col rounded-xl border p-1.5 text-xs shadow-xl ring-1 ring-black/5 backdrop-blur-md outline-hidden duration-150 dark:ring-white/10",
                "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-left-2",
                "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                // Pont invisible de survol pour fluidifier le passage curseur trigger -> popover
                "before:absolute before:-left-3.5 before:top-0 before:h-full before:w-3.5 before:content-['']"
              )}
            >
              {/* Onglets du groupe */}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item: AppShellNavEntry) => {
                  const ItemIcon = iconMap[item.iconKey] ?? iconMap["squares-four"];
                  const isExactRoot = item.href === "/staff" || item.href === "/player";
                  const isItemActive = isExactRoot
                    ? pathname === item.href
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                  const itemBadgeCount =
                    typeof countsOverride[item.href] === "number"
                      ? countsOverride[item.href]
                      : item.badgeCount;

                  if (item.locked) {
                    return (
                      <div
                        key={item.href}
                        className="text-muted-foreground/50 flex h-8.5 items-center gap-2.5 rounded-lg px-2.5 text-xs opacity-60 cursor-not-allowed select-none"
                        title="Verrouillé pour le moment"
                      >
                        <ItemIcon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        <LockSimple className="text-muted-foreground/60 ml-auto size-3 shrink-0" />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group/tab flex h-8.5 items-center justify-between rounded-lg px-2.5 text-xs font-medium transition-all duration-150",
                        isItemActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/85 hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ItemIcon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isItemActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover/tab:text-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {typeof itemBadgeCount === "number" && itemBadgeCount > 0 ? (
                        <span className="bg-primary/15 text-primary ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] leading-none font-semibold tabular-nums">
                          {itemBadgeCount > (item.maxBadgeCount ?? (item.href === "/staff/atlas" ? 999 : 99))
                            ? `${item.maxBadgeCount ?? 99}+`
                            : itemBadgeCount}
                        </span>
                      ) : item.hasNotification && typeof countsOverride[item.href] !== "number" ? (
                        <span className="bg-primary ml-auto size-2 rounded-full animate-pulse" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </SidebarMenuItem>
  );
}
