import {
  BacklogActivityType,
  BacklogPriority,
  BacklogStatus,
  type Role,
} from "@/lib/generated/prisma/enums";

export const BACKLOG_TITLE_MAX_LENGTH = 200;
export const BACKLOG_CHECKLIST_ITEM_MAX_LENGTH = 200;
export const BACKLOG_LABEL_NAME_MAX_LENGTH = 40;
export const BACKLOG_DONE_VISIBLE_LIMIT = 30;
export const BACKLOG_POSITION_STEP = 1024;
/** Nombre de jours avant l'échéance à partir duquel une tâche est signalée comme proche. */
export const BACKLOG_DUE_SOON_DAYS = 2;

export const backlogStatusOrder: BacklogStatus[] = [
  BacklogStatus.TRIAGE,
  BacklogStatus.TODO,
  BacklogStatus.IN_PROGRESS,
  BacklogStatus.TESTING,
  BacklogStatus.DONE,
];

export const backlogStatusLabels: Record<BacklogStatus, string> = {
  [BacklogStatus.TRIAGE]: "À trier",
  [BacklogStatus.TODO]: "À faire",
  [BacklogStatus.IN_PROGRESS]: "En cours",
  [BacklogStatus.TESTING]: "À tester",
  [BacklogStatus.DONE]: "Terminé",
};

export const backlogStatusDotClasses: Record<BacklogStatus, string> = {
  [BacklogStatus.TRIAGE]: "bg-muted-foreground/50",
  [BacklogStatus.TODO]: "bg-sky-500",
  [BacklogStatus.IN_PROGRESS]: "bg-amber-500",
  [BacklogStatus.TESTING]: "bg-violet-500",
  [BacklogStatus.DONE]: "bg-emerald-500",
};

export const backlogPriorityOrder: BacklogPriority[] = [
  BacklogPriority.URGENT,
  BacklogPriority.HIGH,
  BacklogPriority.MEDIUM,
  BacklogPriority.LOW,
];

export const backlogPriorityLabels: Record<BacklogPriority, string> = {
  [BacklogPriority.URGENT]: "Urgente",
  [BacklogPriority.HIGH]: "Haute",
  [BacklogPriority.MEDIUM]: "Moyenne",
  [BacklogPriority.LOW]: "Basse",
};

export const backlogPriorityTextClasses: Record<BacklogPriority, string> = {
  [BacklogPriority.URGENT]: "text-red-600 dark:text-red-400",
  [BacklogPriority.HIGH]: "text-orange-600 dark:text-orange-400",
  [BacklogPriority.MEDIUM]: "text-sky-600 dark:text-sky-400",
  [BacklogPriority.LOW]: "text-muted-foreground",
};

export const backlogLabelColors = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "gray",
] as const;

export type BacklogLabelColor = (typeof backlogLabelColors)[number];

export const backlogLabelColorNames: Record<BacklogLabelColor, string> = {
  red: "Rouge",
  orange: "Orange",
  amber: "Ambre",
  green: "Vert",
  teal: "Turquoise",
  blue: "Bleu",
  violet: "Violet",
  gray: "Gris",
};

export const backlogLabelChipClasses: Record<BacklogLabelColor, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  blue: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  gray: "bg-muted text-muted-foreground",
};

export const backlogLabelDotClasses: Record<BacklogLabelColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
  gray: "bg-muted-foreground/60",
};

export function isBacklogLabelColor(value: string): value is BacklogLabelColor {
  return (backlogLabelColors as readonly string[]).includes(value);
}

export function resolveBacklogLabelColor(value: string): BacklogLabelColor {
  return isBacklogLabelColor(value) ? value : "gray";
}

export interface BacklogUserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  /** Faux pour un ancien assigné qui n'a plus un rôle assignable. */
  assignable: boolean;
}

export interface BacklogLabelRef {
  id: string;
  name: string;
  color: string;
}

export interface BacklogTicketRef {
  id: string;
  subject: string;
  /** Faux quand le staff connecté n'a pas accès au ticket : le lien n'est alors pas cliquable. */
  accessible: boolean;
}

export interface BacklogTaskCard {
  id: string;
  title: string;
  status: BacklogStatus;
  priority: BacklogPriority;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  assigneeId: string | null;
  createdById: string | null;
  labelIds: string[];
  checklistDone: number;
  checklistTotal: number;
  hasDescription: boolean;
  ticket: BacklogTicketRef | null;
}

export interface BacklogChecklistItemData {
  id: string;
  content: string;
  done: boolean;
}

export interface BacklogActivityData {
  id: string;
  type: BacklogActivityType;
  authorName: string | null;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}

export interface BacklogTaskDetail extends BacklogTaskCard {
  description: string;
  createdByName: string | null;
  createdAt: string;
  checklistItems: BacklogChecklistItemData[];
  activities: BacklogActivityData[];
}

/** Position d'une tâche insérée entre deux voisines (indexation fractionnaire). */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return BACKLOG_POSITION_STEP;
  if (prev === null) return (next as number) - BACKLOG_POSITION_STEP;
  if (next === null) return prev + BACKLOG_POSITION_STEP;
  return (prev + next) / 2;
}

export type BacklogDueState = "overdue" | "soon" | "normal";

export function getBacklogDueState(
  dueDate: string | null,
  status: BacklogStatus,
  now: Date = new Date()
): BacklogDueState {
  if (!dueDate || status === BacklogStatus.DONE) return "normal";
  const due = new Date(dueDate);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const diffDays = Math.round((dueDay - today) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= BACKLOG_DUE_SOON_DAYS) return "soon";
  return "normal";
}

/** Une échéance est un jour civil : elle est stockée à midi UTC pour ne pas glisser d'un fuseau à l'autre. */
export function toBacklogDueDateIso(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  ).toISOString();
}

export function fromBacklogDueDateIso(iso: string): Date {
  const date = new Date(iso);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function describeBacklogActivity(activity: BacklogActivityData): string {
  const { type, fromValue, toValue } = activity;
  switch (type) {
    case BacklogActivityType.CREATED:
      return "a créé la tâche";
    case BacklogActivityType.STATUS_CHANGED:
      return `a déplacé la tâche de « ${statusLabel(fromValue)} » vers « ${statusLabel(toValue)} »`;
    case BacklogActivityType.ASSIGNEE_CHANGED:
      return toValue ? `a assigné la tâche à ${toValue}` : "a retiré l'assignation";
    case BacklogActivityType.PRIORITY_CHANGED:
      return `a changé la priorité : ${priorityLabel(fromValue)} → ${priorityLabel(toValue)}`;
    case BacklogActivityType.DUE_DATE_CHANGED:
      return toValue ? `a fixé l'échéance au ${toValue}` : "a retiré l'échéance";
    case BacklogActivityType.TICKET_LINKED:
      return toValue ? `a lié la tâche au ticket « ${toValue} »` : "a lié la tâche à un ticket";
    case BacklogActivityType.ARCHIVED:
      return "a archivé la tâche";
    case BacklogActivityType.RESTORED:
      return "a restauré la tâche";
  }
}

function statusLabel(value: string | null): string {
  return value && value in backlogStatusLabels
    ? backlogStatusLabels[value as BacklogStatus]
    : (value ?? "—");
}

function priorityLabel(value: string | null): string {
  return value && value in backlogPriorityLabels
    ? backlogPriorityLabels[value as BacklogPriority]
    : (value ?? "—");
}
