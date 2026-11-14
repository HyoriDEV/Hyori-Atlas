-- AlterTable
ALTER TABLE "global_settings" ADD COLUMN "retentionGhostDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "retentionEstablishedHours" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "retentionDropPercentage" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "retentionAbsenceDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "retentionInactiveDays" INTEGER NOT NULL DEFAULT 14;
