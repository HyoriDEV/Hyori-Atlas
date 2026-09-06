import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StaffRoleBadgeProps {
  role: Role;
  className?: string;
}

export function StaffRoleBadge({ role, className }: StaffRoleBadgeProps) {
  const label = staffRoleLabels[role] ?? role;

  switch (role) {
    case Role.ADMIN:
      return (
        <Badge variant="destructive" className={cn("font-medium tracking-wide", className)}>
          {label}
        </Badge>
      );
    case Role.DEVELOPER:
      return (
        <Badge variant="inverted" className={cn("font-medium tracking-wide", className)}>
          {label}
        </Badge>
      );
    case Role.COMMUNICATION:
    case Role.CONFLICT_MANAGEMENT:
    case Role.RP_TRACKING:
      return (
        <Badge variant="default" className={cn("font-medium tracking-wide", className)}>
          {label}
        </Badge>
      );
    case Role.PLAYER:
    default:
      return (
        <Badge variant="secondary" className={cn("text-muted-foreground font-normal", className)}>
          {label}
        </Badge>
      );
  }
}
