import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ConversationType, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { serializeConversationMessage } from "@/lib/conversation";
import { sendConversationMessage } from "@/lib/actions/rp-tracking-actions";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ConversationChat } from "@/components/conversations/conversation-chat";

export default async function RpTrackingPage() {
  const user = await requireActivePlayer();
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
            create: [{ userId: user.id }],
          },
        },
        include: {
          messages: {
            include: { author: true },
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
          initialMessages={messages.reverse().map(serializeConversationMessage)}
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
