"use client";

import { useTransition } from "react";
import { UserSwitch, Check } from "@phosphor-icons/react";

import { DEV_TEST_USERS, type DevTestUser } from "@/lib/dev-auth";
import { devSignInAction } from "@/lib/actions/dev-auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DevUserSwitcherProps {
  currentUserId?: string;
  variant?: "inline" | "floating" | "compact";
  redirectTo?: string;
}

export function DevUserSwitcher({
  currentUserId,
  variant = "inline",
  redirectTo,
}: DevUserSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const handleSelectUser = (user: DevTestUser) => {
    startTransition(async () => {
      const targetRedirect = redirectTo ?? (user.role === "PLAYER" ? "/player" : "/staff");
      await devSignInAction(user.id, targetRedirect);
    });
  };

  const activeUser = DEV_TEST_USERS.find((u) => u.id === currentUserId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === "compact" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="h-8 gap-1.5 px-2 text-xs"
            >
              <UserSwitch className="size-3.5 text-amber-500" />
              <span className="truncate">
                {activeUser ? activeUser.roleLabel : "Changer de rôle"}
              </span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="h-8 gap-2 border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
            >
              <UserSwitch className="size-4" />
              <span>{activeUser ? `Test: ${activeUser.roleLabel}` : "Comptes rapides"}</span>
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="z-50 w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between text-xs font-semibold">
            <span>Connexion compte de test</span>
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">
              DEV ONLY
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {DEV_TEST_USERS.map((user) => {
            const isSelected = user.id === currentUserId;
            return (
              <DropdownMenuItem
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="flex cursor-pointer items-center justify-between gap-2 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-6">
                    <AvatarImage src={user.discordAvatarUrl} alt={user.discordDisplayName} />
                    <AvatarFallback>{user.discordDisplayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium">{user.discordDisplayName}</span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {user.roleLabel}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="size-3.5 shrink-0 text-amber-400" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
