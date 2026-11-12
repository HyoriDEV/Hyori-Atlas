import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifyBearerToken } from "@/lib/api/plugin-auth";
import { MessageAuthorType } from "@/lib/generated/prisma/enums";
import { publish } from "@/lib/services/conversation-events";
import { serializeConversationMessage } from "@/lib/conversation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.INTERNAL_BOT_API_KEY;

  if (!expectedKey) {
    console.error("[BOT_API] INTERNAL_BOT_API_KEY is not configured.");
    return NextResponse.json(
      { success: false, message: "Configuration serveur incomplète." },
      { status: 500 }
    );
  }

  if (!verifyBearerToken(authHeader, expectedKey)) {
    return NextResponse.json({ success: false, message: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : null;
    const archivedBy = typeof body?.archivedBy === "string" ? body.archivedBy.trim() : null;

    if (!channelId) {
      return NextResponse.json(
        { success: false, message: "Le paramètre channelId est requis." },
        { status: 400 }
      );
    }

    const topic = await prisma.staffTopic.findFirst({
      where: { channelId },
      include: {
        ticket: {
          select: { id: true, conversationId: true },
        },
      },
    });

    if (!topic) {
      return NextResponse.json({ success: true, message: "Sujet non répertorié dans Atlas." });
    }

    if (topic.isArchived) {
      return NextResponse.json({ success: true, message: "Sujet déjà archivé." });
    }

    await prisma.staffTopic.update({
      where: { id: topic.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    if (topic.ticket) {
      try {
        const staffSuffix = archivedBy ? ` (par ${archivedBy})` : "";
        const systemMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: topic.ticket.conversationId,
            authorType: MessageAuthorType.SYSTEM,
            body: `🔒 Le sujet staff Discord associé (\`#${topic.slug}\`) a été archivé${staffSuffix}.`,
          },
          include: { author: true },
        });

        publish(topic.ticket.conversationId, serializeConversationMessage(systemMsg, true));
      } catch (err) {
        console.warn("[StaffTopic] Échec de l'envoi du message d'archivage dans le ticket:", err);
      }

      revalidatePath(`/staff/tickets/${topic.ticket.id}`);
    }

    revalidatePath("/staff/tickets");

    return NextResponse.json({ success: true, isArchived: true });
  } catch (err) {
    console.error("[BOT_API] Erreur lors de l'archivage du sujet :", err);
    return NextResponse.json(
      { success: false, message: "Erreur interne lors de l'archivage du sujet." },
      { status: 500 }
    );
  }
}
