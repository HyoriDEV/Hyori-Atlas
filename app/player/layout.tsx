import { getPlayerState } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import {
  isRegistrationStatusAtLeast,
  playerNavItems,
  roleLabels,
} from "@/lib/navigation";
import { AppShell, type AppShellNavEntry } from "@/components/app-shell/app-shell";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await getPlayerState();

  const characterSheet = await prisma.characterSheet.findUnique({
    where: { playerId: user.id },
  });

  const isSheetValidated =
    characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED ||
    user.registrationStatus === RegistrationStatus.WHITELISTED;

  const navItems: AppShellNavEntry[] = playerNavItems
    .filter(
      (item) =>
        !item.hiddenFromStatus ||
        !isRegistrationStatusAtLeast(user.registrationStatus, item.hiddenFromStatus)
    )
    .map((item) => {
      let locked = !isRegistrationStatusAtLeast(user.registrationStatus, item.requiredStatus);
      if (item.href === "/player/interview" && !isSheetValidated) {
        locked = true;
      }
      return {
        label: item.label,
        href: item.href,
        iconKey: item.iconKey,
        locked,
      };
    });

  return (
    <AppShell
      sectionLabel="Espace Joueur"
      navItems={navItems}
      user={{
        id: user.id,
        name: user.minecraftUsername ?? user.discordUsername ?? "Joueur",
        secondaryLabel: roleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}

