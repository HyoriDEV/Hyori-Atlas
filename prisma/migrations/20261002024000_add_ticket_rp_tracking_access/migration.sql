-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "rpTrackingAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tickets_rpTrackingAccess_idx" ON "tickets"("rpTrackingAccess");
