import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ConversationType, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { getGlobalSettings } from "@/lib/services/settings-service";

export default async function RpTrackingPage() {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  if (!settings.rpTrackingAccessEnabled) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading shrink-0 text-2xl font-semibold">Suivi RP</h1>
        <LockedFeatureCard description="Un administrateur a temporairement désactivé l'accès au Suivi RP." />
      </div>
    );
  }

  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  let conversation = null;

  if (unlocked) {
    conversation = await prisma.conversation.findFirst({
      where: {
        type: ConversationType.RP_TRACKING,
        members: { some: { userId: user.id } },
      },
      include: {
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

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: ConversationType.RP_TRACKING,
          members: {
            create: [{ userId: user.id }],
          },
        },
        include: {
          messages: {
            include: {
              author: true,
              versions: true,
            },
          },
        },
      });
    }
  }

  const messages = conversation?.messages || [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <h1 className="font-heading shrink-0 text-2xl font-semibold">Suivi RP</h1>
      {unlocked && conversation ? (
        <ConversationChat
          conversationId={conversation.id}
          initialMessages={messages.reverse().map((m) => serializeConversationMessage(m, false))}
          viewerId={user.id}
          viewerIsStaff={false}
          sendAction={sendConversationMessage}
          emptyBadge="Début du suivi RP."
          className="min-h-0 flex-1"
        />
      ) : (
        <LockedFeatureCard />
      )}
    </div>
  );
}
