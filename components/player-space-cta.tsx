"use client";

import Link from "next/link";
import { Shield, SignOut, User } from "@phosphor-icons/react";

import { signInWithDiscord, signOutAction } from "@/lib/actions/auth-actions";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DiscordOfficialIcon } from "@/components/icons/discord-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@/lib/generated/prisma/enums";
import { roleLabels } from "@/lib/navigation";
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
  discordUrl?: string | null;
}

export function PlayerSpaceCta({
  user,
  registrationEnabled = true,
  discordUrl,
}: PlayerSpaceCtaProps) {
  const resolvedDiscordUrl = discordUrl || "https://discord.gg/hyori";

  const discordIconButton = (
    <a
      href={resolvedDiscordUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border/80 bg-card/60 text-muted-foreground flex size-9 cursor-pointer items-center justify-center rounded-full border shadow-xs transition-colors hover:border-[#5865F2]/40 hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
      title="Rejoindre notre Discord"
      aria-label="Rejoindre notre Discord"
    >
      <DiscordOfficialIcon className="size-4.5" />
    </a>
  );

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-2.5">
        {isDevAuthEnabled() && <DevUserSwitcher currentUserId={user.id} />}
        {discordIconButton}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="border-border/80 bg-card/60 hover:border-primary/60 hover:ring-primary/20 flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border shadow-xs transition-all outline-none hover:ring-2"
                title={`Profil — ${user.name}`}
                aria-label="Menu de profil"
              >
                <Avatar className="size-full">
                  {user.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.name}
                      className="size-full object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {user.name ? (
                      user.name.slice(0, 2).toUpperCase()
                    ) : (
                      <User className="size-4.5" weight="bold" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar className="size-8 shrink-0">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold">{user.name}</span>
                <span className="text-muted-foreground truncate text-[11px]">
                  {roleLabels[user.role] ?? "Joueur"}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/player" />} className="cursor-pointer py-2">
              <User className="text-primary size-4 shrink-0" weight="bold" />
              <span className="text-xs font-medium">Espace Joueur</span>
            </DropdownMenuItem>
            {user.role !== Role.PLAYER && (
              <DropdownMenuItem render={<Link href="/staff" />} className="cursor-pointer py-2">
                <Shield className="text-primary size-4 shrink-0" weight="bold" />
                <span className="text-xs font-medium">Espace Staff</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <form action={signOutAction} className="w-full">
              <button
                type="submit"
                className="hover:bg-destructive/10 text-destructive flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
              >
                <SignOut className="size-4 shrink-0" />
                <span>Se déconnecter</span>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {isDevAuthEnabled() && <DevUserSwitcher />}
      {discordIconButton}
      {registrationEnabled ? (
        <form action={signInWithDiscord.bind(null, "/player")}>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="border-border/80 bg-card/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 flex size-9 cursor-pointer items-center justify-center rounded-full border shadow-xs transition-colors"
            title="Espace Joueur — Se connecter"
            aria-label="Accéder à l'Espace Joueur"
          >
            <User className="size-5" weight="bold" />
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            toast.error("Les inscriptions sont actuellement fermées par un administrateur.")
          }
          className="border-border/80 bg-card/60 text-muted-foreground flex size-9 cursor-pointer items-center justify-center rounded-full border opacity-60 shadow-xs transition-all hover:opacity-100"
          title="Inscriptions fermées"
          aria-label="Inscriptions fermées"
        >
          <User className="size-5" weight="bold" />
        </Button>
      )}
    </div>
  );
}
