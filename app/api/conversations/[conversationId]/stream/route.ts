import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { subscribe } from "@/lib/services/conversation-events";
import { ConversationType } from "@/lib/generated/prisma/enums";
import { rpTrackingStaffRoles, ticketStaffRoles } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        where: { userId: user.id },
      },
    },
  });

  if (!conversation) {
    return new Response(null, { status: 404 });
  }

  const isMember = conversation.members.length > 0;

  let hasStaffAccess = false;
  if (!isMember) {
    if (conversation.type === ConversationType.TICKET && ticketStaffRoles.includes(user.role)) {
      hasStaffAccess = true;
    } else if (
      conversation.type === ConversationType.RP_TRACKING &&
      rpTrackingStaffRoles.includes(user.role)
    ) {
      hasStaffAccess = true;
    }
  }

  if (!isMember && !hasStaffAccess) {
    return new Response(null, { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribe(conversationId, (message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch {
          // Stream controller might already be closed
        }
      });

      // Keep connection alive through reverse proxies (e.g. Nginx default 60s timeout)
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
        }
      }, 25000);
    },
    cancel() {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      unsubscribe?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    unsubscribe?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
