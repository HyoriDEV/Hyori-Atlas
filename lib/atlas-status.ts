import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import {
  BdaReportStatus,
  CharacterSheetStatus,
  CharacterStatus,
  RegistrationStatus,
  SanctionType,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function characterStatusBadgeVariant(status: CharacterStatus): BadgeVariant {
  switch (status) {
    case CharacterStatus.ACTIVE:
      return "default";
    case CharacterStatus.DEAD:
      return "destructive";
    case CharacterStatus.DISABLED:
      return "secondary";
  }
}

export function registrationStatusBadgeVariant(status: RegistrationStatus): BadgeVariant {
  switch (status) {
    case RegistrationStatus.WHITELISTED:
      return "default";
    case RegistrationStatus.WHITELIST_IN_PROGRESS:
      return "inverted";
    case RegistrationStatus.WAITLIST:
      return "outline";
    case RegistrationStatus.REJECTED:
      return "destructive";
    case RegistrationStatus.NEW:
      return "secondary";
  }
}

export function characterSheetStatusBadgeVariant(status: CharacterSheetStatus): BadgeVariant {
  switch (status) {
    case CharacterSheetStatus.VALIDATED:
      return "inverted";
    case CharacterSheetStatus.PENDING_STAFF:
      return "default";
    case CharacterSheetStatus.PENDING_PLAYER:
      return "secondary";
    case CharacterSheetStatus.DRAFT:
      return "outline";
  }
}

export function ticketStatusBadgeVariant(status: TicketStatus): BadgeVariant {
  switch (status) {
    case TicketStatus.PENDING_STAFF:
      return "default";
    case TicketStatus.PENDING_PLAYER:
      return "secondary";
    case TicketStatus.ARCHIVED:
      return "outline";
  }
}

export function getTicketSuspendedBadgeClasses(days: number): string {
  if (days < 3) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium";
  }
  if (days < 7) {
    return "border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold";
  }
  return "border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-400 font-bold";
}

export function bdaReportStatusBadgeVariant(status: BdaReportStatus): BadgeVariant {
  switch (status) {
    case BdaReportStatus.UNREAD:
      return "destructive";
    case BdaReportStatus.RESOLVED:
      return "default";
    case BdaReportStatus.ARCHIVED:
      return "outline";
  }
}

export function sanctionTypeBadgeVariant(type: SanctionType): BadgeVariant {
  switch (type) {
    case SanctionType.WARNING:
      return "secondary";
    case SanctionType.SUSPENSION:
      return "inverted";
    case SanctionType.EXCLUSION:
      return "destructive";
  }
}

export function sanctionStatusBadgeVariant(status: "ACTIVE" | "EXPIRED" | "REVOKED"): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "REVOKED":
      return "outline";
  }
}
