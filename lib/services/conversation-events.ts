import type { MessageAuthorType } from "@/lib/generated/prisma/enums";

export interface SerializedConversationMessage {
  id: string;
  conversationId: string;
  authorId: string | null;
  authorType: MessageAuthorType;
  authorName: string | null;
  authorMinecraftUsername: string | null;
  authorAvatarUrl: string | null;
  body: string | null;
  imageUrl: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  createdAt: string;
}

export type ConversationEventPayload =
  | { type: "CREATE"; message: SerializedConversationMessage }
  | { type: "UPDATE"; message: SerializedConversationMessage }
  | { type: "DELETE"; messageId: string; conversationId: string }
  | SerializedConversationMessage;

type Subscriber = (event: ConversationEventPayload) => void;

const globalForConversation = globalThis as unknown as {
  conversationSubscribers: Map<string, Set<Subscriber>> | undefined;
};

const subscribersByConversationId =
  globalForConversation.conversationSubscribers ?? new Map<string, Set<Subscriber>>();

if (process.env.NODE_ENV !== "production") {
  globalForConversation.conversationSubscribers = subscribersByConversationId;
}

export function subscribe(conversationId: string, fn: Subscriber): () => void {
  const existing = subscribersByConversationId.get(conversationId);
  const subscribers = existing ?? new Set<Subscriber>();
  if (!existing) {
    subscribersByConversationId.set(conversationId, subscribers);
  }
  subscribers.add(fn);

  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      subscribersByConversationId.delete(conversationId);
    }
  };
}

export function publish(conversationId: string, event: ConversationEventPayload): void {
  const subscribers = subscribersByConversationId.get(conversationId);
  if (!subscribers) return;
  for (const fn of subscribers) {
    fn(event);
  }
}
