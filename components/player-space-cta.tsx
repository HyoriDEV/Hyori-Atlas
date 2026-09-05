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

import { toast } from "sonner";

export interface PublicNavUser {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

interface PlayerSpaceCtaProps {
  user: PublicNavUser | null;
  registrationEnabled?: boolean;
}

export function PlayerSpaceCta({ user, registrationEnabled = true }: PlayerSpaceCtaProps) {
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
              <span className="text-xs font-medium">Espace Joueur</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/staff" />} className="cursor-pointer py-2">
              <Shield className="text-primary size-4 shrink-0" />
              <span className="text-xs font-medium">Espace Staff</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {isDevAuthEnabled() && <DevUserSwitcher />}
      {registrationEnabled ? (
        <form action={signInWithDiscord.bind(null, "/player")}>
          <Button type="submit">Espace Joueur</Button>
        </form>
      ) : (
        <Button
          variant="secondary"
          onClick={() =>
            toast.error("Les inscriptions sont actuellement fermées par un administrateur.")
          }
        >
          Inscriptions fermées
        </Button>
      )}
    </div>
  );
}
