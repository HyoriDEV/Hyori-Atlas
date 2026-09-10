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
import { TicketMembersManager } from "@/components/dashboard/ticket-members-manager";
import type { PlayerOption } from "@/components/player-select";
import { cn } from "@/lib/utils";

type MemberProps = {
  userId: string;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  isCreator?: boolean;
};

export function TicketMembersSheet({
  ticketId,
  members,
  availablePlayers = [],
  readOnly = false,
  className,
}: {
  ticketId?: string;
  members: MemberProps[];
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
            className={cn(
              "h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium shadow-2xs",
              className
            )}
            title="Voir les membres du ticket"
          >
            <UsersThree className="text-muted-foreground size-4 shrink-0" />
            <span className="hidden sm:inline">Membres</span>
            <span className="bg-muted text-muted-foreground ml-0.5 rounded-full px-1.5 py-0.2 text-[11px] font-semibold">
              {members.length}
            </span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-border/50 shrink-0">
          <SheetTitle className="font-heading text-base font-semibold">Membres du ticket</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {readOnly
              ? "Participants à cette discussion"
              : "Gérer les participants à ce ticket"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          <TicketMembersManager
            ticketId={ticketId}
            members={members}
            availablePlayers={availablePlayers}
            readOnly={readOnly}
            className="border-0 p-0 shadow-none bg-transparent"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
