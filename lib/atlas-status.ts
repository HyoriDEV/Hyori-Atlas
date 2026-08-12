import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";

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
      return "default";
    case CharacterSheetStatus.CHANGES_REQUESTED:
      return "destructive";
    case CharacterSheetStatus.PENDING_REVIEW:
      return "secondary";
  }
}
