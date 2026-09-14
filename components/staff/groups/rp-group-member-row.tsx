"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowSquareOut, ChatCircleDots, Info, UserMinus } from "@phosphor-icons/react";

import type { RpGroupMemberInfo } from "@/lib/rp-groups";
import { removeMemberFromGroupAction } from "@/lib/actions/rp-group-actions";
import {
  characterSheetStatusBadgeVariant,
  registrationStatusBadgeVariant,
} from "@/lib/atlas-status";
import { characterSheetStatusLabels, registrationStatusLabels } from "@/lib/navigation";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkinHead } from "@/components/ui/skin-head";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UnreadDot } from "@/components/ui/unread-dot";

interface RpGroupMemberRowProps {
  member: RpGroupMemberInfo;
  groupId: string;
  canManageGroups?: boolean;
}

export function RpGroupMemberRow({ member, canManageGroups = true }: RpGroupMemberRowProps) {
  const [isPending, startTransition] = useTransition();

  const playerName = member.minecraftUsername ?? member.discordDisplayName;
  const sheet = member.activeSheet;
  const booking = member.latestBooking;

  function handleRemove() {
    startTransition(async () => {
      const res = await removeMemberFromGroupAction(member.id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors du retrait du membre.");
        return;
      }
      toast.success(`${playerName} a été retiré du groupe.`);
    });
  }

  // Determine interview label
  let interviewBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
  let interviewLabel = "Non réservé";

  if (member.registrationStatus === RegistrationStatus.WHITELISTED) {
    interviewBadgeVariant = "default";
    interviewLabel = "Validé";
  } else if (booking) {
    if (booking.status === InterviewBookingStatus.ACCEPTED) {
      interviewBadgeVariant = "default";
      interviewLabel = "Validé";
    } else if (booking.status === InterviewBookingStatus.CHANGES_REQUESTED) {
      interviewBadgeVariant = "destructive";
      interviewLabel = "À modifier";
    } else if (booking.slot) {
      interviewBadgeVariant = "secondary";
      interviewLabel = formatDate(booking.slot.startsAt, {
        style: "prefix-short",
        withTime: true,
      });
    }
  }

  return (
    <div className="bg-card/60 hover:bg-muted/30 flex flex-col justify-between gap-3 rounded-lg border p-3.5 transition-colors">
      {/* Identity & Character */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          {member.minecraftUsername ? (
            <SkinHead size="lg" username={member.minecraftUsername} />
          ) : (
            <Avatar size="lg">
              <AvatarImage src={member.discordAvatarUrl ?? undefined} alt={playerName} />
              <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/staff/atlas/${member.id}`}
              className="truncate text-sm font-medium hover:underline"
            >
              {playerName}
            </Link>
            {member.discordDisplayName !== playerName && (
              <span className="text-muted-foreground truncate text-xs">
                ({member.discordDisplayName})
              </span>
            )}
            {sheet?.additionalComments?.trim() && (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center"
                      title="Voir les membres déclarés"
                    >
                      <Info className="text-primary size-3.5" />
                    </button>
                  }
                />
                <PopoverContent className="w-80 p-3 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-foreground font-semibold">
                      Membres déclarés par le joueur :
                    </span>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {sheet.additionalComments}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="truncate">
              {sheet ? (
                <>
                  <span className="text-foreground/90 font-medium">{sheet.name}</span>
                  {sheet.assignedClass && (
                    <span className="text-primary ml-1">({sheet.assignedClass})</span>
                  )}
                  {!sheet.assignedClass && sheet.chosenClasses.length > 0 && (
                    <span className="ml-1">(Souhait : {sheet.chosenClasses.join(", ")})</span>
                  )}
                </>
              ) : (
                <span className="italic">Aucune fiche personnage</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Badges & Actions */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={registrationStatusBadgeVariant(member.registrationStatus)}
            className="text-[11px]"
          >
            {registrationStatusLabels[member.registrationStatus]}
          </Badge>

          {sheet ? (
            <Badge
              variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}
              className="gap-1.5 text-[11px]"
            >
              <span>{characterSheetStatusLabels[sheet.reviewStatus]}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[11px]">
              Fiche non créée
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {sheet && sheet.reviewStatus === CharacterSheetStatus.PENDING_STAFF && (
            <Button
              render={<Link href={`/staff/atlas/${member.id}/evaluation`} />}
              size="sm"
              variant="default"
              className="h-7 gap-1 text-xs"
            >
              <ChatCircleDots className="size-3.5" />
              <span>Évaluer</span>
            </Button>
          )}

          <Button
            render={<Link href={`/staff/atlas/${member.id}`} />}
            size="icon-sm"
            variant="outline"
            className="size-7"
            title="Consulter le profil Atlas"
          >
            <ArrowSquareOut className="size-3.5" />
          </Button>

          {canManageGroups && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive size-7"
              onClick={handleRemove}
              disabled={isPending}
              title="Retirer du groupe"
            >
              <UserMinus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
