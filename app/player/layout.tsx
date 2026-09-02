import { getPlayerState } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus, Role, TicketStatus } from "@/lib/generated/prisma/enums";
import {
  isRegistrationStatusAtLeast,
  playerPendingNavGroups,
  playerWhitelistedNavGroups,
  playerRejectedNavItem,
  roleLabels,
} from "@/lib/navigation";
import { AppShell, type AppShellNavGroup } from "@/components/app-shell/app-shell";

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

  const [characterSheet, pendingTicketsCount] = await Promise.all([
    prisma.characterSheet.findUnique({
      where: { playerId: user.id },
    }),
    prisma.ticket.count({
      where: {
        conversation: { members: { some: { userId: user.id } } },
        status: TicketStatus.PENDING_PLAYER,
      },
    }),
  ]);

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
          let fullWidth = item.fullWidth;
          if (
            item.href === "/player/character-sheet" &&
            (characterSheet?.reviewStatus === CharacterSheetStatus.PENDING_PLAYER ||
              characterSheet?.reviewStatus === CharacterSheetStatus.PENDING_STAFF)
          ) {
            fullWidth = true;
          }
          const hasNotification =
            (item.href === "/player/character-sheet" &&
              (characterSheet?.hasUnreadFeedback ?? false)) ||
            (item.href === "/player/tickets" && pendingTicketsCount > 0);

          return {
            label: item.label,
            href: item.href,
            iconKey: item.iconKey,
            locked,
            fullWidth,
            hasNotification,
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
