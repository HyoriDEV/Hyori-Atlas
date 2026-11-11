import type { Metadata } from "next";
import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterStatus,
  ConversationType,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { markConversationAsRead } from "@/lib/actions/conversation-actions";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { getGlobalSettings } from "@/lib/services/settings-service";
import {
  getRpTrackingGroupDetail,
  getUserRpTrackingGroups,
} from "@/lib/services/group-rp-tracking-service";
import { PlayerRpSwitcher } from "@/components/player/rp-tracking/player-rp-switcher";
import { PlayerGroupView } from "@/components/player/rp-tracking/player-group-view";

export const metadata: Metadata = {
  title: "Suivi RP",
};

export default async function RpTrackingPage(props: {
  searchParams: Promise<{ groupId?: string; tab?: string }>;
}) {
  const user = await requireActivePlayer();
  const searchParams = await props.searchParams;
  const settings = await getGlobalSettings();

  if (!settings.rpTrackingAccessEnabled) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">Suivi RP</h1>
        <LockedFeatureCard description="Un administrateur a temporairement désactivé l'accès au Suivi RP." />
      </div>
    );
  }

  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  if (!unlocked) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">Suivi RP</h1>
        <LockedFeatureCard />
      </div>
    );
  }

  // Charger le personnage actif et les groupes RP du joueur en parallèle
  const [activeCharacter, userGroups] = await Promise.all([
    prisma.characterSheet.findFirst({
      where: { playerId: user.id, status: CharacterStatus.ACTIVE },
      select: { id: true, name: true },
    }),
    getUserRpTrackingGroups(user.id),
  ]);

  // Récupérer la conversation personnelle du joueur (rpTrackingGroup: null)
  let personalConversation = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.RP_TRACKING,
      rpTrackingGroup: null,
      members: { some: { userId: user.id } },
    },
    include: {
      members: {
        where: { userId: user.id },
      },
      messages: {
        where: { deletedAt: null },
        include: {
          author: true,
          versions: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!personalConversation) {
    personalConversation = await prisma.conversation.create({
      data: {
        type: ConversationType.RP_TRACKING,
        members: {
          create: [{ userId: user.id }],
        },
      },
      include: {
        members: {
          where: { userId: user.id },
        },
        messages: {
          include: {
            author: true,
            versions: true,
          },
        },
      },
    });
  }

  const selectedGroupId = searchParams.groupId?.trim();
  const targetGroupSummary = userGroups.find((g) => g.id === selectedGroupId);

  // Si un groupe valide est sélectionné
  if (selectedGroupId && targetGroupSummary) {
    const groupDetail = await getRpTrackingGroupDetail(selectedGroupId, user.id);

    if (groupDetail) {
      // Marquer automatiquement les messages du groupe comme lus par le joueur
      await markConversationAsRead(groupDetail.conversationId, false);

      const personalMember = personalConversation.members[0];
      const personalThreshold =
        personalMember?.lastReadAt ?? personalMember?.joinedAt ?? new Date(0);
      const personalUnread = personalConversation.messages.some(
        (m) => m.authorId !== user.id && m.createdAt > personalThreshold
      );

      const initialTab = searchParams.tab === "narration" ? "narration" : "chat";

      return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <PlayerRpSwitcher
            currentGroupId={selectedGroupId}
            groups={userGroups}
            personalUnread={personalUnread}
            activeCharacterName={activeCharacter?.name}
            activeCharacterId={activeCharacter?.id}
          />
          <PlayerGroupView group={groupDetail} viewerId={user.id} initialTab={initialTab} />
        </div>
      );
    }
  }

  // Vue personnelle par défaut
  await markConversationAsRead(personalConversation.id, false);

  const messages = personalConversation.messages || [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <PlayerRpSwitcher
        currentGroupId={null}
        groups={userGroups}
        personalUnread={false}
        activeCharacterName={activeCharacter?.name}
        activeCharacterId={activeCharacter?.id}
      />

      <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-lg border">
        <ConversationChat
          conversationId={personalConversation.id}
          initialMessages={messages.reverse().map((m) => serializeConversationMessage(m, false))}
          viewerId={user.id}
          viewerIsStaff={false}
          sendAction={sendConversationMessage}
          emptyBadge="Début de votre suivi RP personnel."
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
