"use client";

import Link from "next/link";
import { User, Users, BookOpen, ArrowSquareOut } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RpTrackingGroupSummary } from "@/lib/services/group-rp-tracking-service";

export function PlayerRpSwitcher({
  currentGroupId,
  groups,
  personalUnread = false,
  activeCharacterName,
  activeCharacterId,
}: {
  currentGroupId?: string | null;
  groups: RpTrackingGroupSummary[];
  personalUnread?: boolean;
  activeCharacterName?: string | null;
  activeCharacterId?: string | null;
}) {
  const isPersonalActive = !currentGroupId;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation entre les suivis */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground mr-1 text-xs font-medium">Espace de suivi :</span>

          {/* Onglet Suivi Personnel */}
          <Link
            href="/player/rp-tracking"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isPersonalActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="size-3.5" />
            <span>Mon suivi personnel</span>
            {personalUnread && !isPersonalActive && (
              <Badge variant="destructive" className="size-2 rounded-full p-0" />
            )}
          </Link>

          {/* Onglets des groupes */}
          {groups.map((group) => {
            const isGroupActive = currentGroupId === group.id;
            const hasUnread = (group.unreadCount ?? 0) > 0;

            return (
              <Link
                key={group.id}
                href={`/player/rp-tracking?groupId=${group.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isGroupActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="size-3.5" />
                <span className="max-w-[140px] truncate">{group.name}</span>
                {hasUnread && !isGroupActive && (
                  <Badge variant="destructive" className="size-2 rounded-full p-0" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Accès rapide à la trame personnelle */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          render={
            <Link
              href={
                activeCharacterId
                  ? `/player/writing?characterId=${activeCharacterId}`
                  : "/player/writing"
              }
            />
          }
        >
          <BookOpen className="text-primary size-3.5" />
          <span>Ma trame de narration</span>
          {activeCharacterName && (
            <span className="text-muted-foreground text-[11px]">({activeCharacterName})</span>
          )}
          <ArrowSquareOut className="text-muted-foreground size-3" />
        </Button>
      </div>
    </div>
  );
}

