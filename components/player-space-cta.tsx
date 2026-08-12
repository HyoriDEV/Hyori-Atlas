"use client";

import Link from "next/link";
import { User } from "@phosphor-icons/react";

import { signInWithDiscord } from "@/lib/actions/auth-actions";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher";
import { Button } from "@/components/ui/button";
import { Role } from "@/lib/generated/prisma/enums";

export interface PublicNavUser {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export function PlayerSpaceCta({ user }: { user: PublicNavUser | null }) {
  if (user) {
    const targetUrl = user.role === Role.PLAYER ? "/player" : "/dashboard";

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {isDevAuthEnabled() && <DevUserSwitcher currentUserId={user.id} />}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-medium text-muted-foreground border border-border/50">
          <User className="size-3.5 text-primary shrink-0" />
          <span className="truncate max-w-[120px] text-foreground">{user.name}</span>
        </div>
        <Button render={<Link href={targetUrl} />}>
          {user.role === Role.PLAYER ? "Espace Joueur" : "Back-Office"}
        </Button>
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
