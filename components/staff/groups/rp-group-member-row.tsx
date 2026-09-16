"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Info, UserMinus } from "@phosphor-icons/react";

import type { RpGroupMemberInfo } from "@/lib/rp-groups";
import { removeMemberFromGroupAction } from "@/lib/actions/rp-group-actions";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkinHead } from "@/components/ui/skin-head";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RpGroupMemberRowProps {
  member: RpGroupMemberInfo;
  groupId: string;
  canManageGroups?: boolean;
}

function getSheetStatusColor(status: CharacterSheetStatus): string {
  switch (status) {
    case CharacterSheetStatus.VALIDATED:
      return "text-emerald-600 dark:text-emerald-400 font-medium";
    case CharacterSheetStatus.PENDING_STAFF:
      return "text-primary font-medium";
    case CharacterSheetStatus.PENDING_PLAYER:
      return "text-muted-foreground";
    case CharacterSheetStatus.DRAFT:
      return "text-muted-foreground";
  }
}

function getSheetStatusLabel(status: CharacterSheetStatus): string {
  switch (status) {
    case CharacterSheetStatus.VALIDATED:
      return "Fiche validée";
    case CharacterSheetStatus.PENDING_STAFF:
      return "Fiche en évaluation";
    case CharacterSheetStatus.PENDING_PLAYER:
      return "Fiche en rédaction";
    case CharacterSheetStatus.DRAFT:
      return "Fiche en brouillon";
  }
}

function getRegistrationStatusColor(status: RegistrationStatus): string {
  switch (status) {
    case RegistrationStatus.WHITELISTED:
      return "text-emerald-600 dark:text-emerald-400 font-medium";
    case RegistrationStatus.WHITELIST_IN_PROGRESS:
      return "text-primary font-medium";
    case RegistrationStatus.WAITLIST:
      return "text-amber-600 dark:text-amber-400 font-medium";
    case RegistrationStatus.NEW:
      return "text-muted-foreground";
    case RegistrationStatus.REJECTED:
      return "text-destructive font-medium";
  }
}

function getRegistrationStatusLabel(status: RegistrationStatus): string {
  switch (status) {
    case RegistrationStatus.WHITELISTED:
      return "Whitelisté";
    case RegistrationStatus.WHITELIST_IN_PROGRESS:
      return "En whitelist";
    case RegistrationStatus.WAITLIST:
      return "Liste d'attente";
    case RegistrationStatus.NEW:
      return "Nouvel inscrit";
    case RegistrationStatus.REJECTED:
      return "Non retenu·e";
  }
}

export function RpGroupMemberRow({
  member,
  groupId: _groupId,
  canManageGroups = true,
}: RpGroupMemberRowProps) {
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

  // Interview label
  let interviewText: string | null = null;
  let interviewColor = "text-muted-foreground";

  if (member.registrationStatus === RegistrationStatus.WHITELISTED) {
    interviewText = null; // covered by registration status
  } else if (booking) {
    if (booking.status === InterviewBookingStatus.ACCEPTED) {
      interviewText = "Entretien validé";
      interviewColor = "text-emerald-600 dark:text-emerald-400 font-medium";
    } else if (booking.status === InterviewBookingStatus.CHANGES_REQUESTED) {
      interviewText = "Modifs demandées";
      interviewColor = "text-destructive font-medium";
    } else if (booking.slot) {
      interviewText = formatDate(booking.slot.startsAt, { style: "prefix-short", withTime: true });
      interviewColor = "text-muted-foreground";
    }
  }

  const regColor = getRegistrationStatusColor(member.registrationStatus);
  const regLabel = getRegistrationStatusLabel(member.registrationStatus);

  return (
    <div className="hover:bg-muted/40 group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors">
      {/* Avatar */}
      <Link
        href={`/staff/atlas/${member.id}`}
        className="shrink-0 transition-opacity hover:opacity-80"
        title={`Voir la fiche Atlas de ${playerName}`}
      >
        {member.minecraftUsername ? (
          <SkinHead size="sm" username={member.minecraftUsername} />
        ) : (
          <Avatar size="sm">
            <AvatarImage src={member.discordAvatarUrl ?? undefined} alt={playerName} />
            <AvatarFallback className="text-xs">
              {playerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </Link>

      {/* Name + RP name */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
        <Link
          href={`/staff/atlas/${member.id}`}
          className="text-foreground shrink-0 truncate text-sm font-medium hover:underline"
        >
          {playerName}
        </Link>
        {sheet ? (
          <span className="text-muted-foreground truncate text-xs">
            {sheet.name}
            {sheet.assignedClass && (
              <span className="text-primary ml-1 font-medium">({sheet.assignedClass})</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground/60 truncate text-xs italic">sans fiche</span>
        )}
        {sheet?.additionalComments?.trim() && (
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center"
                  title="Voir les membres déclarés"
                >
                  <Info className="text-primary size-3.5" />
                </button>
              }
            />
            <PopoverContent className="w-72 p-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <span className="text-foreground font-semibold">Membres déclarés :</span>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {sheet.additionalComments}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status inline */}
      <div className="hidden shrink-0 items-center gap-2 text-xs sm:flex">
        {member.registrationStatus === RegistrationStatus.WHITELISTED ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Whitelisté</span>
        ) : member.registrationStatus === RegistrationStatus.WHITELIST_IN_PROGRESS ? (
          <>
            {sheet ? (
              <span className={getSheetStatusColor(sheet.reviewStatus)}>
                {getSheetStatusLabel(sheet.reviewStatus)}
              </span>
            ) : (
              <span className="text-muted-foreground/60 italic">Fiche non créée</span>
            )}
            {interviewText && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={interviewColor}>{interviewText}</span>
              </>
            )}
          </>
        ) : (
          <>
            <span className={regColor}>{regLabel}</span>
            {sheet && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={getSheetStatusColor(sheet.reviewStatus)}>
                  {getSheetStatusLabel(sheet.reviewStatus)}
                </span>
              </>
            )}
            {interviewText && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={interviewColor}>{interviewText}</span>
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
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
  );
}
