import type { Metadata } from "next";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { backlogManagerRoles, backlogRoles } from "@/lib/navigation";
import { BACKLOG_DONE_VISIBLE_LIMIT, type BacklogLabelRef } from "@/lib/backlog";
import {
  backlogTaskCardInclude,
  getAccessibleTicketIds,
  serializeBacklogTaskCard,
  serializeBacklogUser,
} from "@/lib/services/backlog-service";
import { BacklogStatus } from "@/lib/generated/prisma/enums";
import { BacklogBoard } from "@/components/staff/backlog/backlog-board";

export const metadata: Metadata = {
  title: "Backlog",
};

export default async function StaffBacklogPage() {
  const staffUser = await requireRole(backlogRoles);

  const [openTasks, doneTasks, doneTotal, rawLabels] = await Promise.all([
    prisma.backlogTask.findMany({
      where: { archivedAt: null, status: { not: BacklogStatus.DONE } },
      include: backlogTaskCardInclude,
      orderBy: { position: "asc" },
    }),
    prisma.backlogTask.findMany({
      where: { archivedAt: null, status: BacklogStatus.DONE },
      include: backlogTaskCardInclude,
      orderBy: { completedAt: "desc" },
      take: BACKLOG_DONE_VISIBLE_LIMIT,
    }),
    prisma.backlogTask.count({
      where: { archivedAt: null, status: BacklogStatus.DONE },
    }),
    prisma.backlogLabel.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rawTasks = [...openTasks, ...doneTasks];
  const assigneeIds = rawTasks.flatMap((t) => (t.assigneeId ? [t.assigneeId] : []));

  const [rawUsers, accessibleTicketIds] = await Promise.all([
    // Les anciens assignés restent chargés pour que leurs cartes gardent un avatar.
    prisma.user.findMany({
      where: { OR: [{ role: { in: backlogManagerRoles } }, { id: { in: assigneeIds } }] },
      select: {
        id: true,
        minecraftUsername: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
        role: true,
      },
      orderBy: { discordDisplayName: "asc" },
    }),
    getAccessibleTicketIds(
      staffUser,
      rawTasks.flatMap((t) => (t.ticketId ? [t.ticketId] : []))
    ),
  ]);

  const labels: BacklogLabelRef[] = rawLabels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }));

  return (
    <BacklogBoard
      initialTasks={rawTasks.map((t) => serializeBacklogTaskCard(t, accessibleTicketIds))}
      initialLabels={labels}
      users={rawUsers.map(serializeBacklogUser)}
      currentUserId={staffUser.id}
      canManage={backlogManagerRoles.includes(staffUser.role)}
      hiddenDoneCount={Math.max(0, doneTotal - doneTasks.length)}
    />
  );
}
