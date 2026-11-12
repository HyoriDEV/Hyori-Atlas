"use client";

import { UsersThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GroupMembersManager } from "@/components/staff/rp-tracking/group-members-manager";
import type { RpTrackingGroupMemberInfo } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { cn } from "@/lib/utils";

export function GroupMembersSheet({
  groupId,
  members,
  availablePlayers = [],
  readOnly = false,
  className,
}: {
  groupId: string;
  members: RpTrackingGroupMemberInfo[];
  availablePlayers?: PlayerOption[];
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium shadow-2xs", className)}
            title="Voir les membres du groupe"
          >
            <UsersThree className="text-muted-foreground size-4 shrink-0" />
            <span className="hidden sm:inline">Membres</span>
            <span className="bg-muted text-muted-foreground py-0.2 ml-0.5 rounded-full px-1.5 text-[11px] font-semibold">
              {members.length}
            </span>
          </Button>
        }
      />
      <SheetContent side="right" className="flex h-full w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-border/50 shrink-0 border-b p-4">
          <SheetTitle className="font-heading text-base font-semibold">
            Membres du groupe
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            {readOnly ? "Participants à cette discussion" : "Gérer les participants à ce groupe"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <GroupMembersManager
            groupId={groupId}
            members={members}
            availablePlayers={availablePlayers}
            readOnly={readOnly}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
