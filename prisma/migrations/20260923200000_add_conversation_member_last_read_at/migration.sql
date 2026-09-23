-- AlterTable
ALTER TABLE "conversation_members" ADD COLUMN "lastReadAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
