-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('ACTIVE', 'DEAD', 'DISABLED');

-- DropIndex
DROP INDEX "character_sheets_playerId_key";

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "characterSheetId" TEXT;

-- AlterTable
ALTER TABLE "character_sheets" ADD COLUMN     "status" "CharacterStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "chapters_characterSheetId_idx" ON "chapters"("characterSheetId");

-- CreateIndex
CREATE INDEX "character_sheets_playerId_idx" ON "character_sheets"("playerId");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_characterSheetId_fkey" FOREIGN KEY ("characterSheetId") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
