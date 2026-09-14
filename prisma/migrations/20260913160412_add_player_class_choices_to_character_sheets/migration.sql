-- AlterTable
ALTER TABLE "character_sheets" ADD COLUMN     "primaryClassId" TEXT,
ADD COLUMN     "primaryRoleId" TEXT,
ADD COLUMN     "secondaryClassId" TEXT,
ADD COLUMN     "secondaryRoleId" TEXT;

-- CreateIndex
CREATE INDEX "character_sheets_primaryClassId_idx" ON "character_sheets"("primaryClassId");

-- CreateIndex
CREATE INDEX "character_sheets_primaryRoleId_idx" ON "character_sheets"("primaryRoleId");

-- CreateIndex
CREATE INDEX "character_sheets_secondaryClassId_idx" ON "character_sheets"("secondaryClassId");

-- CreateIndex
CREATE INDEX "character_sheets_secondaryRoleId_idx" ON "character_sheets"("secondaryRoleId");

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_primaryClassId_fkey" FOREIGN KEY ("primaryClassId") REFERENCES "player_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_primaryRoleId_fkey" FOREIGN KEY ("primaryRoleId") REFERENCES "player_class_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_secondaryClassId_fkey" FOREIGN KEY ("secondaryClassId") REFERENCES "player_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_secondaryRoleId_fkey" FOREIGN KEY ("secondaryRoleId") REFERENCES "player_class_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
