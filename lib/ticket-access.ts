import "server-only";

import { prisma } from "@/lib/prisma";
import { ConversationType, Role, TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { allStaffRoles, rpTrackingStaffRoles } from "@/lib/navigation";

export interface TicketAccessUser {
  id: string;
  role: Role;
}

const NO_TICKET: Prisma.TicketWhereInput = { id: { in: [] } };

/**
 * Seuls les administrateurs ont un accès global à tous les tickets sans restriction de catégorie.
 */
export function hasFullTicketAccess(role: Role): boolean {
  return role === Role.ADMIN;
}

/**
 * Vérifie si un ticket est considéré comme spoiler/confidentiel.
 * Obsolète : le concept de spoiler a été supprimé.
 */
export function isTicketSpoiler(): boolean {
  return false;
}

/**
 * Alias de compatibilité pour l'ancien nom de fonction.
 */
export function isTicketSecret(): boolean {
  return false;
}

/**
 * Filtre Prisma des tickets visibles par un membre du staff :
 * - Non-staff : aucun ticket.
 * - ADMIN : tous les tickets.
 * - Autres rôles du staff : tickets des catégories autorisant leur rôle.
 */
export function ticketAccessWhere(user: TicketAccessUser): Prisma.TicketWhereInput {
  if (!allStaffRoles.includes(user.role)) {
    return NO_TICKET;
  }
  if (user.role === Role.ADMIN) {
    return {};
  }

  const categoryMatchesRole: Prisma.TicketWhereInput = {
    OR: [
      { categoryRef: { allowedRoles: { has: user.role } } },
      {
        AND: [
          { categoryRef: null },
          // Repli sur categoryName pour les tickets sans référence
          user.role === Role.DEVELOPER
            ? {}
            : {
                AND: [
                  { category: { not: TicketCategory.TECHNIQUE } },
                  { categoryName: { notIn: ["Technique", "Ticket technique"] } },
                ],
              },
        ],
      },
    ],
  };

  return categoryMatchesRole;
}

export async function canAccessTicket(user: TicketAccessUser, ticketId: string): Promise<boolean> {
  const count = await prisma.ticket.count({
    where: { AND: [{ id: ticketId }, ticketAccessWhere(user)] },
  });
  return count > 0;
}

export async function canAccessConversationAsStaff(
  user: TicketAccessUser,
  conversationId: string
): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (!conversation) {
    return false;
  }
  if (conversation.type === ConversationType.RP_TRACKING) {
    return rpTrackingStaffRoles.includes(user.role);
  }
  const count = await prisma.ticket.count({
    where: { AND: [{ conversationId }, ticketAccessWhere(user)] },
  });
  return count > 0;
}

/**
 * Tickets actifs accessibles ayant une activité postérieure à la dernière lecture du staff
 * (ou jamais ouverts par lui).
 */
export async function getUnreadTickets(
  user: TicketAccessUser
): Promise<{ id: string; conversationId: string }[]> {
  const tickets = await prisma.ticket.findMany({
    where: { AND: [ticketAccessWhere(user), { status: { not: TicketStatus.ARCHIVED } }] },
    select: {
      id: true,
      conversationId: true,
      lastMessageAt: true,
      conversation: {
        select: {
          reads: {
            where: { userId: user.id },
            select: { lastReadAt: true },
          },
        },
      },
    },
  });

  return tickets
    .filter((ticket) => {
      const read = ticket.conversation.reads[0];
      return !read || ticket.lastMessageAt > read.lastReadAt;
    })
    .map((ticket) => ({ id: ticket.id, conversationId: ticket.conversationId }));
}
