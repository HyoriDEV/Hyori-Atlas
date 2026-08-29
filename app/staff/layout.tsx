import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { getStaffNavGroups, staffRoleLabels } from "@/lib/navigation";
import { AppShell, type AppShellNavGroup } from "@/components/app-shell/app-shell";

const staffRoles = Object.values(Role).filter((role) => role !== Role.PLAYER);

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(staffRoles);

  const roleGroups = getStaffNavGroups(user.role);

  const navGroups: AppShellNavGroup[] = roleGroups
    .map((group) => ({
      title: group.title,
      items: group.items
        .filter((item) => item.roles.includes(user.role))
        .map((item) => ({
          label: item.label,
          href: item.href,
          iconKey: item.iconKey,
          fullWidth: item.fullWidth,
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AppShell
      sectionLabel="Espace Staff"
      navGroups={navGroups}
      user={{
        id: user.id,
        name: user.minecraftUsername ?? user.discordUsername ?? "Staff",
        secondaryLabel: staffRoleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
        isStaff: true,
      }}
    >
      {children}
    </AppShell>
  );
}
