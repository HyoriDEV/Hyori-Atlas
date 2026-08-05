"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  TicketCategory,
  TicketMessageAuthorType,
  TicketStatus,
} from "@/lib/generated/prisma/enums";

export async function createTicket(category: TicketCategory, subject: string, description: string) {
  const user = await requireUser();

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();

  if (!trimmedSubject || !trimmedDescription) {
    throw new Error("Le sujet et la description sont requis.");
  }

  const ticket = await prisma.ticket.create({
    data: {
      playerId: user.id,
      category,
      subject: trimmedSubject,
      messages: {
        create: [
          {
            authorType: TicketMessageAuthorType.SYSTEM,
            body: `Ticket créé par ${user.minecraftUsername ?? user.discordUsername ?? "un joueur"}.`,
          },
          {
            authorType: TicketMessageAuthorType.PLAYER,
            authorId: user.id,
            body: trimmedDescription,
          },
        ],
      },
    },
  });

  revalidatePath("/player/tickets");
  redirect(`/player/tickets/${ticket.id}`);
}

export async function sendTicketMessage(ticketId: string, body: string) {
  const user = await requireUser();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Le message ne peut pas être vide.");
  }

  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  if (ticket.playerId !== user.id) {
    throw new Error("Ce ticket ne vous appartient pas.");
  }
  if (ticket.status === TicketStatus.ARCHIVED) {
    throw new Error("Ce ticket est archivé.");
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorType: TicketMessageAuthorType.PLAYER,
      authorId: user.id,
      body: trimmedBody,
    },
  });

  revalidatePath(`/player/tickets/${ticketId}`);
}
