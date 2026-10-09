"use server";

import { revalidatePath } from "next/cache";
import DOMPurify from "isomorphic-dompurify";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { backlogManagerRoles, backlogRoles } from "@/lib/navigation";
import { canAccessTicket, hasFullTicketAccess } from "@/lib/ticket-access";
import { setTicketTeamSummon } from "@/lib/actions/ticket-actions";
import {
  BACKLOG_CHECKLIST_ITEM_MAX_LENGTH,
  BACKLOG_LABEL_NAME_MAX_LENGTH,
  BACKLOG_POSITION_STEP,
  BACKLOG_TITLE_MAX_LENGTH,
  isBacklogLabelColor,
  type BacklogLabelRef,
  type BacklogTaskCard,
  type BacklogTaskDetail,
} from "@/lib/backlog";
import {
  backlogTaskCardInclude,
  backlogUserName,
  getAccessibleTicketIds,
  getBacklogTaskCards,
  getBacklogTaskDetail,
  serializeBacklogTaskCard,
} from "@/lib/services/backlog-service";
import {
  BacklogActivityType,
  BacklogPriority,
  BacklogStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface BacklogActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

type BacklogActor = Awaited<ReturnType<typeof requireRole>>;

/** Erreur dont le message est destiné à être affiché tel quel à l'utilisateur. */
class BacklogError extends Error {}

async function runBacklogAction<T>(
  roles: Role[],
  handler: (actor: BacklogActor) => Promise<T>
): Promise<BacklogActionResult<T>> {
  const actor = await requireRole(roles);
  try {
    const data = await handler(actor);
    return { success: true, data };
  } catch (err) {
    if (err instanceof BacklogError) {
      return { success: false, error: err.message };
    }
    console.error("[Backlog]", err);
    return { success: false, error: "Une erreur est survenue." };
  }
}

function revalidateBacklog(ticketId?: string | null) {
  revalidatePath("/staff/backlog");
  if (ticketId) {
    revalidatePath(`/staff/tickets/${ticketId}`);
  }
}

function parseTitle(raw: string): string {
  const title = raw.trim();
  if (!title) {
    throw new BacklogError("Le titre de la tâche ne peut pas être vide.");
  }
  if (title.length > BACKLOG_TITLE_MAX_LENGTH) {
    throw new BacklogError(`Le titre ne peut pas dépasser ${BACKLOG_TITLE_MAX_LENGTH} caractères.`);
  }
  return title;
}

function parseStatus(value: string): BacklogStatus {
  if (!(value in BacklogStatus)) {
    throw new BacklogError("Statut invalide.");
  }
  return value as BacklogStatus;
}

function parsePriority(value: string): BacklogPriority {
  if (!(value in BacklogPriority)) {
    throw new BacklogError("Priorité invalide.");
  }
  return value as BacklogPriority;
}

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BacklogError("Date d'échéance invalide.");
  }
  return date;
}

function sanitizeDescription(raw: string): string | null {
  const html = DOMPurify.sanitize(raw);
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text ? html : null;
}

function formatDueDateForActivity(date: Date | null): string | null {
  return date ? formatDate(date, { style: "compact", withTime: false, withYear: true }) : null;
}

async function findAssignee(assigneeId: string) {
  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, role: { in: backlogManagerRoles } },
    select: { id: true, minecraftUsername: true, discordDisplayName: true },
  });
  if (!assignee) {
    throw new BacklogError("Cette personne ne peut pas être assignée à une tâche.");
  }
  return assignee;
}

async function nextPositionInColumn(status: BacklogStatus): Promise<number> {
  const last = await prisma.backlogTask.aggregate({
    where: { status, archivedAt: null },
    _max: { position: true },
  });
  return (last._max.position ?? 0) + BACKLOG_POSITION_STEP;
}

async function requireTask(taskId: string) {
  const task = await prisma.backlogTask.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new BacklogError("Tâche introuvable.");
  }
  return task;
}

async function requireDetail(actor: BacklogActor, taskId: string): Promise<BacklogTaskDetail> {
  const detail = await getBacklogTaskDetail(actor, taskId);
  if (!detail) {
    throw new BacklogError("Tâche introuvable.");
  }
  return detail;
}

export async function createBacklogTaskAction(input: {
  title: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  ticketId?: string | null;
  summonDevelopers?: boolean;
}): Promise<BacklogActionResult<BacklogTaskCard>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const title = parseTitle(input.title);
    const status = input.status ? parseStatus(input.status) : BacklogStatus.TRIAGE;
    const priority = input.priority ? parsePriority(input.priority) : BacklogPriority.MEDIUM;
    const assignee = input.assigneeId ? await findAssignee(input.assigneeId) : null;

    let ticket: { id: string; subject: string } | null = null;
    if (input.ticketId) {
      // Un ticket inaccessible est indiscernable d'un ticket inexistant.
      if (!(await canAccessTicket(actor, input.ticketId))) {
        throw new BacklogError("Ticket introuvable.");
      }
      ticket = await prisma.ticket.findUnique({
        where: { id: input.ticketId },
        select: { id: true, subject: true },
      });
      if (!ticket) {
        throw new BacklogError("Ticket introuvable.");
      }
    }

    const position = await nextPositionInColumn(status);
    const activities: Prisma.BacklogActivityCreateWithoutTaskInput[] = [
      { type: BacklogActivityType.CREATED, author: { connect: { id: actor.id } } },
    ];
    if (ticket) {
      activities.push({
        type: BacklogActivityType.TICKET_LINKED,
        toValue: ticket.subject,
        author: { connect: { id: actor.id } },
      });
    }

    const task = await prisma.backlogTask.create({
      data: {
        title,
        status,
        priority,
        position,
        completedAt: status === BacklogStatus.DONE ? new Date() : null,
        createdById: actor.id,
        assigneeId: assignee?.id ?? null,
        ticketId: ticket?.id ?? null,
        activities: { create: activities },
      },
      include: backlogTaskCardInclude,
    });

    if (ticket && input.summonDevelopers && hasFullTicketAccess(actor.role)) {
      await setTicketTeamSummon(ticket.id, Role.DEVELOPER, true);
    }

    revalidateBacklog(ticket?.id);
    const accessibleTicketIds = await getAccessibleTicketIds(actor, ticket ? [ticket.id] : []);
    return serializeBacklogTaskCard(task, accessibleTicketIds);
  });
}

export async function updateBacklogTaskAction(
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    labelIds?: string[];
  }
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const task = await requireTask(taskId);
    const data: Prisma.BacklogTaskUncheckedUpdateInput = {};
    const activities: Prisma.BacklogActivityCreateManyInput[] = [];
    const logActivity = (
      type: BacklogActivityType,
      fromValue: string | null,
      toValue: string | null
    ) => activities.push({ taskId, authorId: actor.id, type, fromValue, toValue });

    if (patch.title !== undefined) {
      data.title = parseTitle(patch.title);
    }

    if (patch.description !== undefined) {
      data.description = sanitizeDescription(patch.description);
    }

    if (patch.status !== undefined) {
      const status = parseStatus(patch.status);
      if (status !== task.status) {
        data.status = status;
        data.position = await nextPositionInColumn(status);
        data.completedAt = status === BacklogStatus.DONE ? new Date() : null;
        logActivity(BacklogActivityType.STATUS_CHANGED, task.status, status);
      }
    }

    if (patch.priority !== undefined) {
      const priority = parsePriority(patch.priority);
      if (priority !== task.priority) {
        data.priority = priority;
        logActivity(BacklogActivityType.PRIORITY_CHANGED, task.priority, priority);
      }
    }

    if (patch.assigneeId !== undefined && patch.assigneeId !== task.assigneeId) {
      const assignee = patch.assigneeId ? await findAssignee(patch.assigneeId) : null;
      data.assigneeId = assignee?.id ?? null;
      logActivity(
        BacklogActivityType.ASSIGNEE_CHANGED,
        null,
        assignee ? backlogUserName(assignee) : null
      );
    }

    if (patch.dueDate !== undefined) {
      const dueDate = parseDueDate(patch.dueDate);
      if ((dueDate?.getTime() ?? null) !== (task.dueDate?.getTime() ?? null)) {
        data.dueDate = dueDate;
        logActivity(
          BacklogActivityType.DUE_DATE_CHANGED,
          formatDueDateForActivity(task.dueDate),
          formatDueDateForActivity(dueDate)
        );
      }
    }

    if (patch.labelIds !== undefined) {
      const existing = await prisma.backlogLabel.findMany({
        where: { id: { in: patch.labelIds } },
        select: { id: true },
      });
      data.labels = { set: existing };
    }

    await prisma.$transaction([
      prisma.backlogTask.update({ where: { id: taskId }, data }),
      ...(activities.length > 0 ? [prisma.backlogActivity.createMany({ data: activities })] : []),
    ]);

    revalidateBacklog(task.ticketId);
    return requireDetail(actor, taskId);
  });
}

export async function moveBacklogTaskAction(
  taskId: string,
  status: string,
  position: number
): Promise<BacklogActionResult> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const task = await requireTask(taskId);
    const nextStatus = parseStatus(status);
    if (!Number.isFinite(position)) {
      throw new BacklogError("Position invalide.");
    }

    const statusChanged = nextStatus !== task.status;
    await prisma.$transaction([
      prisma.backlogTask.update({
        where: { id: taskId },
        data: {
          status: nextStatus,
          position,
          ...(statusChanged
            ? { completedAt: nextStatus === BacklogStatus.DONE ? new Date() : null }
            : {}),
        },
      }),
      ...(statusChanged
        ? [
            prisma.backlogActivity.create({
              data: {
                taskId,
                authorId: actor.id,
                type: BacklogActivityType.STATUS_CHANGED,
                fromValue: task.status,
                toValue: nextStatus,
              },
            }),
          ]
        : []),
    ]);

    revalidateBacklog(statusChanged ? task.ticketId : null);
  });
}

export async function setBacklogTaskArchivedAction(
  taskId: string,
  archived: boolean
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const task = await requireTask(taskId);
    if (Boolean(task.archivedAt) !== archived) {
      await prisma.$transaction([
        prisma.backlogTask.update({
          where: { id: taskId },
          data: {
            archivedAt: archived ? new Date() : null,
            // Une tâche restaurée revient en bas de sa colonne.
            ...(archived ? {} : { position: await nextPositionInColumn(task.status) }),
          },
        }),
        prisma.backlogActivity.create({
          data: {
            taskId,
            authorId: actor.id,
            type: archived ? BacklogActivityType.ARCHIVED : BacklogActivityType.RESTORED,
          },
        }),
      ]);
    }

    revalidateBacklog(task.ticketId);
    return requireDetail(actor, taskId);
  });
}

export async function archiveDoneBacklogTasksAction(): Promise<
  BacklogActionResult<{ count: number }>
> {
  return runBacklogAction(backlogManagerRoles, async (actor) => {
    const tasks = await prisma.backlogTask.findMany({
      where: { status: BacklogStatus.DONE, archivedAt: null },
      select: { id: true, ticketId: true },
    });
    if (tasks.length === 0) {
      return { count: 0 };
    }

    await prisma.$transaction([
      prisma.backlogTask.updateMany({
        where: { id: { in: tasks.map((t) => t.id) } },
        data: { archivedAt: new Date() },
      }),
      prisma.backlogActivity.createMany({
        data: tasks.map((t) => ({
          taskId: t.id,
          authorId: actor.id,
          type: BacklogActivityType.ARCHIVED,
        })),
      }),
    ]);

    revalidateBacklog();
    for (const task of tasks) {
      if (task.ticketId) {
        revalidatePath(`/staff/tickets/${task.ticketId}`);
      }
    }
    return { count: tasks.length };
  });
}

export async function deleteBacklogTaskAction(taskId: string): Promise<BacklogActionResult> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const task = await requireTask(taskId);
    const canDelete = backlogManagerRoles.includes(actor.role) || task.createdById === actor.id;
    if (!canDelete) {
      throw new BacklogError("Seul l'auteur de la tâche ou un développeur peut la supprimer.");
    }
    await prisma.backlogTask.delete({ where: { id: taskId } });
    revalidateBacklog(task.ticketId);
  });
}

export async function getBacklogTaskDetailAction(
  taskId: string
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, (actor) => requireDetail(actor, taskId));
}

export async function getArchivedBacklogTasksAction(): Promise<
  BacklogActionResult<BacklogTaskCard[]>
> {
  return runBacklogAction(backlogRoles, (actor) =>
    getBacklogTaskCards(actor, { archivedAt: { not: null } }, [{ archivedAt: "desc" }])
  );
}

// --- Checklist ---

function parseChecklistContent(raw: string): string {
  const content = raw.trim();
  if (!content) {
    throw new BacklogError("L'élément ne peut pas être vide.");
  }
  if (content.length > BACKLOG_CHECKLIST_ITEM_MAX_LENGTH) {
    throw new BacklogError(
      `Un élément ne peut pas dépasser ${BACKLOG_CHECKLIST_ITEM_MAX_LENGTH} caractères.`
    );
  }
  return content;
}

export async function addBacklogChecklistItemAction(
  taskId: string,
  content: string
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    await requireTask(taskId);
    const parsed = parseChecklistContent(content);
    const last = await prisma.backlogChecklistItem.aggregate({
      where: { taskId },
      _max: { position: true },
    });
    await prisma.backlogChecklistItem.create({
      data: { taskId, content: parsed, position: (last._max.position ?? -1) + 1 },
    });
    revalidateBacklog();
    return requireDetail(actor, taskId);
  });
}

export async function updateBacklogChecklistItemAction(
  itemId: string,
  patch: { done?: boolean; content?: string }
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const item = await prisma.backlogChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new BacklogError("Élément introuvable.");
    }
    await prisma.backlogChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(patch.done !== undefined ? { done: patch.done } : {}),
        ...(patch.content !== undefined ? { content: parseChecklistContent(patch.content) } : {}),
      },
    });
    revalidateBacklog();
    return requireDetail(actor, item.taskId);
  });
}

export async function deleteBacklogChecklistItemAction(
  itemId: string
): Promise<BacklogActionResult<BacklogTaskDetail>> {
  return runBacklogAction(backlogRoles, async (actor) => {
    const item = await prisma.backlogChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new BacklogError("Élément introuvable.");
    }
    await prisma.backlogChecklistItem.delete({ where: { id: itemId } });
    revalidateBacklog();
    return requireDetail(actor, item.taskId);
  });
}

// --- Étiquettes ---

function parseLabelInput(input: { name: string; color: string }) {
  const name = input.name.trim();
  if (!name) {
    throw new BacklogError("Le nom de l'étiquette ne peut pas être vide.");
  }
  if (name.length > BACKLOG_LABEL_NAME_MAX_LENGTH) {
    throw new BacklogError(
      `Le nom d'une étiquette ne peut pas dépasser ${BACKLOG_LABEL_NAME_MAX_LENGTH} caractères.`
    );
  }
  if (!isBacklogLabelColor(input.color)) {
    throw new BacklogError("Couleur invalide.");
  }
  return { name, color: input.color };
}

async function assertLabelNameAvailable(name: string, exceptId?: string) {
  const duplicate = await prisma.backlogLabel.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new BacklogError("Une étiquette porte déjà ce nom.");
  }
}

export async function createBacklogLabelAction(input: {
  name: string;
  color: string;
}): Promise<BacklogActionResult<BacklogLabelRef>> {
  return runBacklogAction(backlogRoles, async () => {
    const data = parseLabelInput(input);
    await assertLabelNameAvailable(data.name);
    const label = await prisma.backlogLabel.create({ data });
    revalidateBacklog();
    return { id: label.id, name: label.name, color: label.color };
  });
}

export async function updateBacklogLabelAction(
  labelId: string,
  input: { name: string; color: string }
): Promise<BacklogActionResult<BacklogLabelRef>> {
  return runBacklogAction(backlogManagerRoles, async () => {
    const data = parseLabelInput(input);
    await assertLabelNameAvailable(data.name, labelId);
    const label = await prisma.backlogLabel.update({ where: { id: labelId }, data });
    revalidateBacklog();
    return { id: label.id, name: label.name, color: label.color };
  });
}

export async function deleteBacklogLabelAction(labelId: string): Promise<BacklogActionResult> {
  return runBacklogAction(backlogManagerRoles, async () => {
    await prisma.backlogLabel.delete({ where: { id: labelId } });
    revalidateBacklog();
  });
}
