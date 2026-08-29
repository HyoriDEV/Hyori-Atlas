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
  Kanban,
  Info,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth-actions";
import type { NavIconKey } from "@/lib/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  kanban: Kanban,
  info: Info,
};

export interface AppShellNavEntry {
  label: string;
  href: string;
  iconKey: NavIconKey;
  locked?: boolean;
  fullWidth?: boolean;
  hasNotification?: boolean;
}

export interface AppShellUser {
  id?: string;
  name: string;
  secondaryLabel: string;
  avatarUrl?: string | null;
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
  navGroups?: AppShellNavEntry[][];
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = user.name.charAt(0).toUpperCase();

  const groups: AppShellNavEntry[][] = (
    navGroups ?? (navItems ? [navItems] : [])
  ).filter((group) => group.length > 0);

  const allNavItems = groups.flat();
  const isFullWidth = allNavItems.some(
    (item) => item.fullWidth && (pathname === item.href || pathname?.startsWith(`${item.href}/`))
  );

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
              className="size-9 rounded-full object-cover shrink-0 shadow-xs"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-lg font-normal leading-tight">
                Hyori RP
              </span>
              <span className="text-sidebar-foreground/60 text-xs tracking-wide uppercase">
                {sectionLabel}
              </span>
            </div>
          </Link>
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
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded-md p-1.5"
              >
                <SignOut className="size-4" />
              </button>
            </form>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-0 pb-3">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex flex-col">
              {groupIndex > 0 && <Separator className="my-2" />}
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.map((item) => {
                      const isActive = pathname?.startsWith(item.href) ?? false;
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
            </div>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="h-svh max-h-svh flex flex-col overflow-hidden">
        <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className={cn("text-muted-foreground text-sm")}>{sectionLabel}</span>
        </header>
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-y-auto">
          <div className={cn("mx-auto w-full flex-1 min-h-0 flex flex-col", !isFullWidth && "max-w-[960px]")}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
