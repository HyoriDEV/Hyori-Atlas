import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { staffNavGroups, staffRoleLabels } from "@/lib/navigation";
import { AppShell, type AppShellNavEntry } from "@/components/app-shell/app-shell";

const staffRoles = Object.values(Role).filter((role) => role !== Role.PLAYER);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(staffRoles);

  const navGroups: AppShellNavEntry[][] = staffNavGroups
    .map((group) =>
      group
        .filter((item) => item.roles.includes(user.role))
        .map((item) => ({
          label: item.label,
          href: item.href,
          iconKey: item.iconKey,
          fullWidth: item.fullWidth,
        }))
    )
    .filter((group) => group.length > 0);

  return (
    <AppShell
      sectionLabel="Back-Office"
      navGroups={navGroups}
      user={{
        id: user.id,
        name: user.minecraftUsername ?? user.discordUsername ?? "Staff",
        secondaryLabel: staffRoleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
