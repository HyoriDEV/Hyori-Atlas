import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { staffNavItems, staffRoleLabels } from "@/lib/navigation";
import { AppShell, type AppShellNavEntry } from "@/components/app-shell/app-shell";

const staffRoles = Object.values(Role).filter((role) => role !== Role.PLAYER);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(staffRoles);

  const navItems: AppShellNavEntry[] = staffNavItems
    .filter((item) => item.roles.includes(user.role))
    .map((item) => ({
      label: item.label,
      href: item.href,
      iconKey: item.iconKey,
      fullWidth: item.fullWidth,
    }));

  return (
    <AppShell
      sectionLabel="Back-Office"
      navItems={navItems}
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
