import { getPlayerState } from "@/lib/dal";
import {
  isRegistrationStatusAtLeast,
  playerNavItems,
  roleLabels,
} from "@/lib/navigation";
import { AppShell, type AppShellNavEntry } from "@/components/app-shell/app-shell";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await getPlayerState();

  const navItems: AppShellNavEntry[] = playerNavItems
    .filter(
      (item) =>
        !item.hiddenFromStatus ||
        !isRegistrationStatusAtLeast(user.registrationStatus, item.hiddenFromStatus)
    )
    .map((item) => ({
      label: item.label,
      href: item.href,
      iconKey: item.iconKey,
      locked: !isRegistrationStatusAtLeast(user.registrationStatus, item.requiredStatus),
    }));

  return (
    <AppShell
      sectionLabel="Espace Joueur"
      navItems={navItems}
      user={{
        name: user.minecraftUsername ?? user.discordUsername ?? "Joueur",
        secondaryLabel: roleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
