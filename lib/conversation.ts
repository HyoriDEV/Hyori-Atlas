import type { ConversationMessage, User } from "@/lib/generated/prisma/client";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";

export function serializeConversationMessage(
  message: ConversationMessage & { author: User | null }
): SerializedConversationMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    authorId: message.authorId,
    authorType: message.authorType,
    authorName: message.author
      ? (message.author.minecraftUsername ?? message.author.discordDisplayName)
      : null,
    authorMinecraftUsername: message.author?.minecraftUsername ?? null,
    authorAvatarUrl: message.author?.discordAvatarUrl ?? null,
    body: message.body,
    imageUrl: message.imageUrl,
    linkHref: message.linkHref,
    linkLabel: message.linkLabel,
    createdAt: message.createdAt.toISOString(),
  };
}
