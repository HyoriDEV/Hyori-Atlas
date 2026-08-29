import { getPlayerState } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import {
  isRegistrationStatusAtLeast,
  playerNavGroups,
  playerWhitelistedNavGroups,
  playerRejectedNavItem,
  roleLabels,
} from "@/lib/navigation";
import { AppShell, type AppShellNavEntry } from "@/components/app-shell/app-shell";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await getPlayerState();

  if (user.registrationStatus === RegistrationStatus.REJECTED) {
    const rejectedNavGroups: AppShellNavEntry[][] = [
      [
        {
          label: playerRejectedNavItem.label,
          href: playerRejectedNavItem.href,
          iconKey: playerRejectedNavItem.iconKey,
          locked: false,
        },
      ],
    ];

    return (
      <AppShell
        sectionLabel="Espace Joueur"
        navGroups={rejectedNavGroups}
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

  const characterSheet = await prisma.characterSheet.findUnique({
    where: { playerId: user.id },
  });

  const isSheetValidated =
    characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED ||
    user.registrationStatus === RegistrationStatus.WHITELISTED;

  const baseGroups =
    user.registrationStatus === RegistrationStatus.WHITELISTED
      ? playerWhitelistedNavGroups
      : playerNavGroups;

  const navGroups: AppShellNavEntry[][] = baseGroups
    .map((group) =>
      group
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
          let fullWidth = item.fullWidth;
          if (
            item.href === "/player/character-sheet" &&
            (characterSheet?.reviewStatus === CharacterSheetStatus.PENDING_PLAYER ||
              characterSheet?.reviewStatus === CharacterSheetStatus.PENDING_STAFF)
          ) {
            fullWidth = true;
          }
          return {
            label: item.label,
            href: item.href,
            iconKey: item.iconKey,
            locked,
            fullWidth,
            hasNotification:
              item.href === "/player/character-sheet" &&
              (characterSheet?.hasUnreadFeedback ?? false),
          };
        })
    )
    .filter((group) => group.length > 0);

  return (
    <AppShell
      sectionLabel="Espace Joueur"
      navGroups={navGroups}
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
