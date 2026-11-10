-- CreateTable
CREATE TABLE "staff_topics" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "context" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "channelId" VARCHAR(64) NOT NULL,
    "channelUrl" VARCHAR(255),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "ticketId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_topics_ticketId_idx" ON "staff_topics"("ticketId");

-- CreateIndex
CREATE INDEX "staff_topics_isArchived_idx" ON "staff_topics"("isArchived");

-- AddForeignKey
ALTER TABLE "staff_topics" ADD CONSTRAINT "staff_topics_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_topics" ADD CONSTRAINT "staff_topics_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

