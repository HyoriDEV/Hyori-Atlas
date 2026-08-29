import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ConversationType, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendStaffConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ConversationChat } from "@/components/conversations/conversation-chat";

export default async function RpTrackingStaffDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const staffUser = await requireRole(rpTrackingStaffRoles);

  const player = await prisma.user.findUnique({ where: { id: playerId } });

  if (!player || player.registrationStatus !== RegistrationStatus.WHITELISTED) {
    notFound();
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.RP_TRACKING,
      members: { some: { userId: playerId } },
    },
    include: {
      messages: {
        include: { author: true },
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
        messages: {
          include: { author: true },
        },
      },
    });
  }

  const messages = conversation.messages || [];

  const playerName = player.minecraftUsername ?? player.discordDisplayName;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 h-full">
      <div className="flex shrink-0 items-center gap-3">
        <AtlasBackButton href="/dashboard/rp-tracking" />
        <h1 className="font-heading flex-1 text-lg font-semibold">{playerName}</h1>
      </div>

      <ConversationChat
        conversationId={conversation.id}
        initialMessages={messages.reverse().map(serializeConversationMessage)}
        viewerId={staffUser.id}
        viewerIsStaff
        sendAction={sendStaffConversationMessage}
        emptyBadge="Début du suivi RP."
        className="flex-1 min-h-0"
      />
    </div>
  );
}
