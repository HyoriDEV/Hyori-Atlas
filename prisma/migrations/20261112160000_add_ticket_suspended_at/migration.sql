-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tickets_suspendedAt_idx" ON "tickets"("suspendedAt");
