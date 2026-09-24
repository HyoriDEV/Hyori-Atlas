import { getPlayerState } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  RegistrationStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  isRegistrationStatusAtLeast,
  playerPendingNavGroups,
  playerWhitelistedNavGroups,
  playerRejectedNavItem,
  roleLabels,
} from "@/lib/navigation";
import { AppShell, type AppShellNavGroup } from "@/components/app-shell/app-shell";
import { getPlayerBadgeCounts } from "@/lib/actions/sidebar-actions";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await getPlayerState();

  if (user.registrationStatus === RegistrationStatus.REJECTED) {
    const rejectedNavGroups: AppShellNavGroup[] = [
      {
        items: [
          {
            label: playerRejectedNavItem.label,
            href: playerRejectedNavItem.href,
            iconKey: playerRejectedNavItem.iconKey,
            locked: false,
          },
        ],
      },
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
          isStaff: user.role !== Role.PLAYER,
        }}
      >
        {children}
      </AppShell>
    );
  }

  const [characterSheet, badgeMap] = await Promise.all([
    prisma.characterSheet.findFirst({
      where: { playerId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { reviewStatus: true },
    }),
    getPlayerBadgeCounts(user.id),
  ]);

  const staffCommentsCount = badgeMap["/player/character-sheet"] ?? 0;
  const unreadTicketsCount = badgeMap["/player/tickets"] ?? 0;

  const isSheetValidated =
    characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED ||
    user.registrationStatus === RegistrationStatus.WHITELISTED;

  const baseGroups =
    user.registrationStatus === RegistrationStatus.WHITELISTED
      ? playerWhitelistedNavGroups
      : playerPendingNavGroups;

  const navGroups: AppShellNavGroup[] = baseGroups
    .map((group) => ({
      title: group.title,
      items: group.items
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
          const fullWidth = item.fullWidth;
          let badgeCount: number | undefined = undefined;
          if (item.href === "/player/character-sheet") {
            badgeCount = staffCommentsCount;
          } else if (item.href === "/player/tickets") {
            badgeCount = unreadTicketsCount;
          }

          return {
            label: item.label,
            href: item.href,
            iconKey: item.iconKey,
            locked,
            fullWidth,
            badgeCount,
            hasNotification: Boolean(badgeCount && badgeCount > 0),
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AppShell
      sectionLabel="Espace Joueur"
      navGroups={navGroups}
      user={{
        id: user.id,
        name: user.minecraftUsername ?? user.discordUsername ?? "Joueur",
        secondaryLabel: roleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
        isStaff: user.role !== Role.PLAYER,
      }}
    >
      {children}
    </AppShell>
  );
}
