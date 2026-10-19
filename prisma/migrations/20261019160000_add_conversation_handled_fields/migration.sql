-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "lastHandledAt" TIMESTAMP(3),
ADD COLUMN "lastHandledById" TEXT;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lastHandledById_fkey" FOREIGN KEY ("lastHandledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
