-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_rpTrackingGroupId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "chapters_rpTrackingGroupId_idx";

-- AlterTable
ALTER TABLE "chapters" ALTER COLUMN "playerId" SET NOT NULL;
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "rpTrackingGroupId";
