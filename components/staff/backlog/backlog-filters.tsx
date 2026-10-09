"use client";

import { MagnifyingGlass, User, X } from "@phosphor-icons/react";

import {
  backlogPriorityLabels,
  backlogPriorityOrder,
  type BacklogLabelRef,
  type BacklogTaskCard,
  type BacklogUserRef,
} from "@/lib/backlog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const BACKLOG_FILTER_ALL = "ALL";
export const BACKLOG_FILTER_UNASSIGNED = "NONE";

export interface BacklogFilterState {
  search: string;
  mineOnly: boolean;
  assignee: string;
  priority: string;
  label: string;
}

export const emptyBacklogFilters: BacklogFilterState = {
  search: "",
  mineOnly: false,
  assignee: BACKLOG_FILTER_ALL,
  priority: BACKLOG_FILTER_ALL,
  label: BACKLOG_FILTER_ALL,
};

export function hasActiveBacklogFilters(filters: BacklogFilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.mineOnly ||
    filters.assignee !== BACKLOG_FILTER_ALL ||
    filters.priority !== BACKLOG_FILTER_ALL ||
    filters.label !== BACKLOG_FILTER_ALL
  );
}

export function matchesBacklogFilters(
  task: BacklogTaskCard,
  filters: BacklogFilterState,
  currentUserId: string
): boolean {
  const query = filters.search.trim().toLowerCase();
  if (query && !task.title.toLowerCase().includes(query)) {
    return false;
  }
  if (filters.mineOnly && task.assigneeId !== currentUserId && task.createdById !== currentUserId) {
    return false;
  }
  if (filters.assignee === BACKLOG_FILTER_UNASSIGNED) {
    if (task.assigneeId !== null) return false;
  } else if (filters.assignee !== BACKLOG_FILTER_ALL && task.assigneeId !== filters.assignee) {
    return false;
  }
  if (filters.priority !== BACKLOG_FILTER_ALL && task.priority !== filters.priority) {
    return false;
  }
  if (filters.label !== BACKLOG_FILTER_ALL && !task.labelIds.includes(filters.label)) {
    return false;
  }
  return true;
}

interface BacklogFiltersProps {
  filters: BacklogFilterState;
  users: BacklogUserRef[];
  labels: BacklogLabelRef[];
  onChange: (filters: BacklogFilterState) => void;
}

export function BacklogFilters({ filters, users, labels, onChange }: BacklogFiltersProps) {
  const assigneeItems = [
    { value: BACKLOG_FILTER_ALL, label: "Toutes les assignations" },
    { value: BACKLOG_FILTER_UNASSIGNED, label: "Non assignées" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];
  const priorityItems = [
    { value: BACKLOG_FILTER_ALL, label: "Toutes les priorités" },
    ...backlogPriorityOrder.map((priority) => ({
      value: priority,
      label: backlogPriorityLabels[priority],
    })),
  ];
  const labelItems = [
    { value: BACKLOG_FILTER_ALL, label: "Toutes les étiquettes" },
    ...labels.map((label) => ({ value: label.id, label: label.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Rechercher une tâche…"
          aria-label="Rechercher une tâche"
          className="h-9 pl-9 text-sm"
        />
      </div>

      <Button
        type="button"
        variant={filters.mineOnly ? "default" : "outline"}
        aria-pressed={filters.mineOnly}
        title="Tâches qui me sont assignées ou que j'ai créées"
        onClick={() => onChange({ ...filters, mineOnly: !filters.mineOnly })}
        className="h-9"
      >
        <User />
        Mes tâches
      </Button>

      <Select
        items={assigneeItems}
        value={filters.assignee}
        onValueChange={(value) => onChange({ ...filters, assignee: value ?? BACKLOG_FILTER_ALL })}
      >
        <SelectTrigger className="h-9 text-sm" aria-label="Filtrer par assignation">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-52">
          {assigneeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={priorityItems}
        value={filters.priority}
        onValueChange={(value) => onChange({ ...filters, priority: value ?? BACKLOG_FILTER_ALL })}
      >
        <SelectTrigger className="h-9 text-sm" aria-label="Filtrer par priorité">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-44">
          {priorityItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={labelItems}
        value={filters.label}
        onValueChange={(value) => onChange({ ...filters, label: value ?? BACKLOG_FILTER_ALL })}
      >
        <SelectTrigger className="h-9 text-sm" aria-label="Filtrer par étiquette">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-44">
          {labelItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveBacklogFilters(filters) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyBacklogFilters)}
        >
          <X />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
