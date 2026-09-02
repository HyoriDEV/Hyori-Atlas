import type {
  ConversationMessage,
  ConversationMessageVersion,
  User,
} from "@/lib/generated/prisma/client";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";

export function serializeConversationMessage(
  message: ConversationMessage & {
    author: User | null;
    versions?: ConversationMessageVersion[];
  },
  isStaff: boolean = false
): SerializedConversationMessage {
  const isEdited = (message.versions && message.versions.length > 0) || false;

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
    updatedAt: message.updatedAt ? message.updatedAt.toISOString() : undefined,
    deletedAt: isStaff && message.deletedAt ? message.deletedAt.toISOString() : null,
    isEdited,
    versions:
      isStaff && message.versions && message.versions.length > 0
        ? message.versions.map((v) => ({
            id: v.id,
            body: v.body,
            createdAt: v.createdAt.toISOString(),
          }))
        : undefined,
  };
}
