import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import {
  CharacterSheetStatus,
  RegistrationStatus,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

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
