-- CreateEnum
CREATE TYPE "BacklogStatus" AS ENUM ('TRIAGE', 'TODO', 'IN_PROGRESS', 'TESTING', 'DONE');

-- CreateEnum
CREATE TYPE "BacklogPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BacklogActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED', 'TICKET_LINKED', 'ARCHIVED', 'RESTORED');

-- CreateTable
CREATE TABLE "backlog_tasks" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "BacklogStatus" NOT NULL DEFAULT 'TRIAGE',
    "priority" "BacklogPriority" NOT NULL DEFAULT 'MEDIUM',
    "position" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "assigneeId" TEXT,
    "ticketId" TEXT,

    CONSTRAINT "backlog_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_labels" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlog_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" VARCHAR(200) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlog_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_activities" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" "BacklogActivityType" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlog_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BacklogLabelToBacklogTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BacklogLabelToBacklogTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "backlog_tasks_status_position_idx" ON "backlog_tasks"("status", "position");

-- CreateIndex
CREATE INDEX "backlog_tasks_assigneeId_idx" ON "backlog_tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "backlog_tasks_ticketId_idx" ON "backlog_tasks"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "backlog_labels_name_key" ON "backlog_labels"("name");

-- CreateIndex
CREATE INDEX "backlog_checklist_items_taskId_position_idx" ON "backlog_checklist_items"("taskId", "position");

-- CreateIndex
CREATE INDEX "backlog_activities_taskId_createdAt_idx" ON "backlog_activities"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "_BacklogLabelToBacklogTask_B_index" ON "_BacklogLabelToBacklogTask"("B");

-- AddForeignKey
ALTER TABLE "backlog_tasks" ADD CONSTRAINT "backlog_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_tasks" ADD CONSTRAINT "backlog_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_tasks" ADD CONSTRAINT "backlog_tasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_checklist_items" ADD CONSTRAINT "backlog_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "backlog_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_activities" ADD CONSTRAINT "backlog_activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "backlog_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_activities" ADD CONSTRAINT "backlog_activities_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BacklogLabelToBacklogTask" ADD CONSTRAINT "_BacklogLabelToBacklogTask_A_fkey" FOREIGN KEY ("A") REFERENCES "backlog_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BacklogLabelToBacklogTask" ADD CONSTRAINT "_BacklogLabelToBacklogTask_B_fkey" FOREIGN KEY ("B") REFERENCES "backlog_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

