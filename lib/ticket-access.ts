import "server-only";

import { prisma } from "@/lib/prisma";
import { ConversationType, Role, TicketCategory, TicketStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { allStaffRoles, rpTrackingStaffRoles, secretTicketStaffRoles } from "@/lib/navigation";

export interface TicketAccessUser {
  id: string;
  role: Role;
}

const NO_TICKET: Prisma.TicketWhereInput = { id: { in: [] } };

/**
 * Rôles ayant accès aux spoilers RP et aux tickets sensibles : ADMIN et RP_TRACKING.
 */
export function hasFullTicketAccess(role: Role): boolean {
  return secretTicketStaffRoles.includes(role);
}

/**
 * Vérifie si un ticket est considéré comme spoiler/confidentiel.
 */
export function isTicketSpoiler(ticket: {
  isSpoiler?: boolean;
  category?: TicketCategory;
}): boolean {
  return Boolean(ticket.isSpoiler || ticket.category === TicketCategory.SECRET);
}

/**
 * Alias de compatibilité pour l'ancien nom de fonction.
 */
export function isTicketSecret(category: TicketCategory): boolean {
  return category === TicketCategory.SECRET;
}

/**
 * Filtre Prisma des tickets visibles par un membre du staff :
 * - Non-staff : aucun ticket.
 * - ADMIN : tous les tickets.
 * - RP_TRACKING : tickets dont la catégorie autorise le Suivi RP (y compris spoilers),
 *   plus les tickets où ils sont convoqués ou invités.
 * - DEVELOPER : tickets non-spoiler dont la catégorie autorise DEVELOPER (Technique + RP standard),
 *   plus les tickets où ils sont convoqués ou invités.
 * - Autres rôles (HELPER, CONFLICT_MANAGEMENT, EVENT) : tickets non-spoiler dont la catégorie autorise leur rôle,
 *   plus les tickets où ils sont convoqués ou invités.
 */
export function ticketAccessWhere(user: TicketAccessUser): Prisma.TicketWhereInput {
  if (!allStaffRoles.includes(user.role)) {
    return NO_TICKET;
  }
  if (user.role === Role.ADMIN) {
    return {};
  }

  const isSummonedOrExplicit: Prisma.TicketWhereInput = {
    OR: [
      { teamSummons: { some: { team: user.role } } },
      { staffAccesses: { some: { userId: user.id } } },
    ],
  };

  const categoryMatchesRole: Prisma.TicketWhereInput = {
    OR: [
      { categoryRef: { allowedRoles: { has: user.role } } },
      {
        AND: [
          { categoryRef: null },
          // Repli sur categoryName pour les tickets sans référence
          user.role === Role.DEVELOPER ? {} : { categoryName: { not: "Technique" } },
        ],
      },
    ],
  };

  // L'équipe Suivi RP a accès aux spoilers des catégories qui l'autorisent (notamment RP)
  if (user.role === Role.RP_TRACKING) {
    return {
      OR: [isSummonedOrExplicit, categoryMatchesRole],
    };
  }

  // Les autres rôles du staff n'ont JAMAIS accès aux tickets spoilers (sauf convocation/invitation explicite)
  return {
    OR: [
      isSummonedOrExplicit,
      {
        AND: [{ isSpoiler: false }, categoryMatchesRole],
      },
    ],
  };
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
