import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { backlogManagerRoles } from "@/lib/navigation";
import { ticketAccessWhere, type TicketAccessUser } from "@/lib/ticket-access";
import type { BacklogTaskCard, BacklogTaskDetail, BacklogUserRef } from "@/lib/backlog";
import type { Role } from "@/lib/generated/prisma/enums";

export const backlogTaskCardInclude = {
  labels: { select: { id: true } },
  checklistItems: { select: { done: true } },
  ticket: { select: { id: true, subject: true } },
} satisfies Prisma.BacklogTaskInclude;

type BacklogTaskCardRecord = Prisma.BacklogTaskGetPayload<{
  include: typeof backlogTaskCardInclude;
}>;

interface BacklogUserRecord {
  id: string;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  role: Role;
}

export function backlogUserName(user: {
  minecraftUsername: string | null;
  discordDisplayName: string;
}): string {
  return user.minecraftUsername ?? user.discordDisplayName;
}

export function serializeBacklogUser(user: BacklogUserRecord): BacklogUserRef {
  return {
    id: user.id,
    name: backlogUserName(user),
    avatarUrl: user.discordAvatarUrl,
    role: user.role,
    assignable: backlogManagerRoles.includes(user.role),
  };
}

/** Identifiants, parmi ceux fournis, des tickets que le staff peut ouvrir. */
export async function getAccessibleTicketIds(
  user: TicketAccessUser,
  ticketIds: string[]
): Promise<Set<string>> {
  const uniqueIds = [...new Set(ticketIds)];
  if (uniqueIds.length === 0) {
    return new Set();
  }
  const tickets = await prisma.ticket.findMany({
    where: { AND: [{ id: { in: uniqueIds } }, ticketAccessWhere(user)] },
    select: { id: true },
  });
  return new Set(tickets.map((t) => t.id));
}

export function serializeBacklogTaskCard(
  task: BacklogTaskCardRecord,
  accessibleTicketIds: Set<string>
): BacklogTaskCard {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    position: task.position,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    archivedAt: task.archivedAt?.toISOString() ?? null,
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    labelIds: task.labels.map((l) => l.id),
    checklistDone: task.checklistItems.filter((i) => i.done).length,
    checklistTotal: task.checklistItems.length,
    hasDescription: Boolean(task.description),
    ticket: task.ticket
      ? {
          id: task.ticket.id,
          subject: task.ticket.subject,
          accessible: accessibleTicketIds.has(task.ticket.id),
        }
      : null,
  };
}

export async function getBacklogTaskCards(
  user: TicketAccessUser,
  where: Prisma.BacklogTaskWhereInput,
  orderBy: Prisma.BacklogTaskOrderByWithRelationInput[] = [{ position: "asc" }]
): Promise<BacklogTaskCard[]> {
  const tasks = await prisma.backlogTask.findMany({
    where,
    include: backlogTaskCardInclude,
    orderBy,
  });
  const accessibleTicketIds = await getAccessibleTicketIds(
    user,
    tasks.flatMap((t) => (t.ticketId ? [t.ticketId] : []))
  );
  return tasks.map((t) => serializeBacklogTaskCard(t, accessibleTicketIds));
}

export async function getBacklogTaskDetail(
  user: TicketAccessUser,
  taskId: string
): Promise<BacklogTaskDetail | null> {
  const task = await prisma.backlogTask.findUnique({
    where: { id: taskId },
    include: {
      labels: { select: { id: true } },
      ticket: { select: { id: true, subject: true } },
      createdBy: { select: { minecraftUsername: true, discordDisplayName: true } },
      checklistItems: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { minecraftUsername: true, discordDisplayName: true } },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  const accessibleTicketIds = await getAccessibleTicketIds(
    user,
    task.ticketId ? [task.ticketId] : []
  );

  return {
    ...serializeBacklogTaskCard(task, accessibleTicketIds),
    description: task.description ?? "",
    createdByName: task.createdBy ? backlogUserName(task.createdBy) : null,
    createdAt: task.createdAt.toISOString(),
    checklistItems: task.checklistItems.map((i) => ({
      id: i.id,
      content: i.content,
      done: i.done,
    })),
    activities: task.activities.map((a) => ({
      id: a.id,
      type: a.type,
      authorName: a.author ? backlogUserName(a.author) : null,
      fromValue: a.fromValue,
      toValue: a.toValue,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
