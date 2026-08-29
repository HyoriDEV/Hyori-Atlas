"use client";

import Link from "next/link";
import { CaretDown, Shield, User } from "@phosphor-icons/react";

import { signInWithDiscord } from "@/lib/actions/auth-actions";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@/lib/generated/prisma/enums";

export interface PublicNavUser {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export function PlayerSpaceCta({ user }: { user: PublicNavUser | null }) {
  if (user) {
    if (user.role === Role.PLAYER) {
      return (
        <div className="flex items-center gap-2 sm:gap-3">
          {isDevAuthEnabled() && <DevUserSwitcher currentUserId={user.id} />}
          <Button render={<Link href="/player" />}>Espace Joueur</Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {isDevAuthEnabled() && <DevUserSwitcher currentUserId={user.id} />}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="gap-2">
                <span>Accès Espace</span>
                <CaretDown className="size-3.5 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem render={<Link href="/player" />} className="cursor-pointer py-2">
              <User className="text-primary size-4 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Espace Joueur</span>
                <span className="text-muted-foreground text-[10px]">Profil, fiche, tickets</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/staff" />} className="cursor-pointer py-2">
              <Shield className="text-primary size-4 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Espace Staff</span>
                <span className="text-muted-foreground text-[10px]">Outils de gestion</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {isDevAuthEnabled() && <DevUserSwitcher />}
      <form action={signInWithDiscord.bind(null, "/player")}>
        <Button type="submit">Espace Joueur</Button>
      </form>
    </div>
  );
}
