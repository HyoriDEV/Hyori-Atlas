"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LockSimple,
  SignOut,
  Flag,
  CalendarBlank,
  IdentificationCard,
  Ticket,
  PenNib,
  ChatCircle,
  ClockCountdown,
  UsersThree,
  ShieldWarning,
  Info,
  SquaresFour,
  User,
  Shield,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth-actions";
import type { NavIconKey } from "@/lib/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const iconMap: Record<NavIconKey, typeof Flag> = {
  flag: Flag,
  calendar: CalendarBlank,
  "id-card": IdentificationCard,
  ticket: Ticket,
  pen: PenNib,
  chat: ChatCircle,
  clock: ClockCountdown,
  users: UsersThree,
  shield: ShieldWarning,
  info: Info,
  "squares-four": SquaresFour,
};

export interface AppShellNavEntry {
  label: string;
  href: string;
  iconKey: NavIconKey;
  locked?: boolean;
  fullWidth?: boolean;
  hasNotification?: boolean;
}

export interface AppShellNavGroup {
  title?: string;
  items: AppShellNavEntry[];
}

export interface AppShellUser {
  id?: string;
  name: string;
  secondaryLabel: string;
  avatarUrl?: string | null;
  isStaff?: boolean;
}

export function AppShell({
  sectionLabel,
  navItems,
  navGroups,
  user,
  children,
}: {
  sectionLabel: string;
  navItems?: AppShellNavEntry[];
  navGroups?: (AppShellNavGroup | AppShellNavEntry[])[];
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = user.name.charAt(0).toUpperCase();

  const groups: AppShellNavGroup[] = (navGroups ?? (navItems ? [{ items: navItems }] : []))
    .map((group) => {
      if (Array.isArray(group)) {
        return { items: group };
      }
      return group;
    })
    .filter((group) => group.items.length > 0);

  const allNavItems = groups.flatMap((group) => group.items);
  const isFullWidth = allNavItems.some((item) => {
    if (!item.fullWidth) return false;
    const isExactRoot = item.href === "/player" || item.href === "/staff";
    return isExactRoot
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`);
  });

  const isStaffDashboard = sectionLabel === "Espace Staff";

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex flex-col gap-3 px-3 pt-3 pb-0">
          <Link
            href="/"
            className="flex items-center gap-3 px-2 transition-opacity hover:opacity-85"
          >
            <Image
              src="/HYORI-LOGO-COMPRESSED.jpg"
              alt="Logo Hyori RP"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full object-cover shadow-xs"
            />
            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-lg leading-tight font-normal">Hyori RP</span>
              <span className="text-sidebar-foreground/60 text-xs tracking-wide uppercase">
                {sectionLabel}
              </span>
            </div>
          </Link>
          {user.isStaff && (
            <div className="px-2 pt-1">
              {isStaffDashboard ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 text-xs font-medium"
                  render={<Link href="/player" />}
                >
                  <User className="text-primary size-3.5 shrink-0" />
                  <span>Basculer sur Joueur</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 text-xs font-medium"
                  render={<Link href="/staff" />}
                >
                  <Shield className="text-primary size-3.5 shrink-0" />
                  <span>Basculer sur Staff</span>
                </Button>
              )}
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="gap-3 px-3 pt-1 pb-3">
          {groups.map((group, groupIndex) => (
            <SidebarGroup key={groupIndex} className="p-0">
              {group.title && (
                <SidebarGroupLabel className="text-sidebar-foreground/50 flex h-7 items-center gap-2 px-2 text-[11px] font-semibold tracking-wider uppercase select-none">
                  <span className="shrink-0">{group.title}</span>
                  <span className="bg-sidebar-border/70 h-px flex-1" />
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isExactRoot = item.href === "/staff" || item.href === "/player";
                    const isActive = isExactRoot
                      ? pathname === item.href
                      : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const Icon = iconMap[item.iconKey];

                    if (item.locked) {
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            aria-disabled
                            tooltip="Verrouillé pour le moment"
                            className="pointer-events-none opacity-50"
                          >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                            <LockSimple className="ml-auto size-3.5" />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton isActive={isActive} render={<Link href={item.href} />}>
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.hasNotification && (
                          <SidebarMenuBadge>
                            <span className="bg-primary size-2 rounded-full" />
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="flex flex-col gap-3 p-3">
          <Separator />
          <div className="flex items-center gap-2 px-2">
            <Avatar className="size-8">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/60 truncate text-sm">
                {user.secondaryLabel}
              </span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Déconnexion"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer rounded-md p-1.5 transition-colors"
              >
                <SignOut className="size-4" />
              </button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex h-svh max-h-svh flex-col overflow-hidden">
        <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className={cn("text-muted-foreground text-sm")}>{sectionLabel}</span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          <div
            className={cn(
              "mx-auto flex min-h-0 w-full flex-1 flex-col",
              !isFullWidth && "max-w-[960px]"
            )}
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
