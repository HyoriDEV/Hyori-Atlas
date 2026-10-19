import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterStatus,
  ConversationType,
  MessageAuthorType,
  RegistrationStatus,
  SanctionType,
} from "@/lib/generated/prisma/enums";
import { characterSheetReviewerRoles, rpTrackingStaffRoles } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { markConversationAsRead } from "@/lib/actions/conversation-actions";
import { RpTrackingWorkspace } from "@/components/staff/rp-tracking/rp-tracking-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const player = await prisma.user.findUnique({
    where: { id: playerId },
    select: { minecraftUsername: true, discordDisplayName: true, discordUsername: true },
  });

  const playerName =
    player?.minecraftUsername || player?.discordDisplayName || player?.discordUsername;
  return {
    title: playerName ? `Suivi RP : ${playerName}` : "Suivi RP joueur",
  };
}

export default async function RpTrackingStaffDetailPage(props: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ characterId?: string }>;
}) {
  const { playerId } = await props.params;
  const searchParams = await props.searchParams;
  const staffUser = await requireRole(rpTrackingStaffRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      sanctions: {
        where: {
          type: SanctionType.EXCLUSION,
          revokedAt: null,
        },
      },
      characterSheets: {
        orderBy: { createdAt: "desc" },
        include: {
          primaryClass: true,
          primaryRole: true,
          secondaryClass: true,
          secondaryRole: true,
        },
      },
    },
  });

  // Les joueurs exclus ou non whitelistés ne doivent pas apparaître dans les interfaces de suivi RP
  if (
    !player ||
    player.registrationStatus !== RegistrationStatus.WHITELISTED ||
    player.sanctions.length > 0
  ) {
    notFound();
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.RP_TRACKING,
      members: { some: { userId: playerId } },
    },
    include: {
      lastHandledBy: {
        select: {
          id: true,
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      messages: {
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

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: ConversationType.RP_TRACKING,
        members: {
          create: [{ userId: playerId }],
        },
      },
      include: {
        lastHandledBy: {
          select: {
            id: true,
            minecraftUsername: true,
            discordDisplayName: true,
          },
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

  // Marquer automatiquement la conversation comme lue par le staff dès consultation
  await markConversationAsRead(conversation.id, true);

  const messages = conversation.messages || [];

  // Sélection du personnage actif ou filtré
  const selectedCharacter =
    (searchParams.characterId
      ? player.characterSheets.find((c) => c.id === searchParams.characterId)
      : null) ??
    player.characterSheets.find((c) => c.status === CharacterStatus.ACTIVE) ??
    player.characterSheets[0] ??
    null;

  // Chapitres de narration du personnage
  const chapters = await prisma.chapter.findMany({
    where: {
      playerId,
      ...(selectedCharacter ? { characterSheetId: selectedCharacter.id } : {}),
    },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      order: true,
    },
  });

  const playerName =
    player.minecraftUsername ?? player.discordDisplayName ?? player.discordUsername;

  // Calcul du statut de traitement
  const lastPlayerMessage = messages.find((m) => m.authorType === MessageAuthorType.PLAYER);
  const lastStaffMessage = messages.find((m) => m.authorType === MessageAuthorType.STAFF);

  const lastPlayerTime = lastPlayerMessage ? new Date(lastPlayerMessage.createdAt).getTime() : 0;
  const lastStaffTime = lastStaffMessage ? new Date(lastStaffMessage.createdAt).getTime() : 0;
  const lastHandledTime = conversation.lastHandledAt
    ? new Date(conversation.lastHandledAt).getTime()
    : 0;

  const isPending = Boolean(
    lastPlayerTime > 0 && lastStaffTime < lastPlayerTime && lastHandledTime < lastPlayerTime
  );

  const isHandledWithoutReply =
    !isPending && lastHandledTime > 0 && (lastStaffTime === 0 || lastHandledTime > lastStaffTime);

  const lastHandledByName =
    conversation.lastHandledBy?.minecraftUsername ??
    conversation.lastHandledBy?.discordDisplayName ??
    null;

  const canReviewSheet = characterSheetReviewerRoles.includes(staffUser.role);

  return (
    <RpTrackingWorkspace
      conversationId={conversation.id}
      initialMessages={messages.reverse().map((m) => serializeConversationMessage(m, true))}
      viewerId={staffUser.id}
      player={{
        id: player.id,
        playerName,
        minecraftUsername: player.minecraftUsername,
        discordDisplayName: player.discordDisplayName,
        discordUsername: player.discordUsername,
        discordAvatarUrl: player.discordAvatarUrl,
      }}
      handledState={{
        isPending,
        isHandledWithoutReply,
        lastHandledAt: conversation.lastHandledAt ? conversation.lastHandledAt.toISOString() : null,
        lastHandledByName,
      }}
      characters={player.characterSheets.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        reviewStatus: c.reviewStatus,
        createdAt: c.createdAt,
      }))}
      selectedCharacter={selectedCharacter}
      chapters={chapters}
      canReviewSheet={canReviewSheet}
    />
  );
}
