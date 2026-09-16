-- AlterTable
ALTER TABLE "character_sheets" ADD COLUMN     "overrideClassId" TEXT,
ADD COLUMN     "overrideRoleId" TEXT;

-- CreateIndex
CREATE INDEX "character_sheets_overrideClassId_idx" ON "character_sheets"("overrideClassId");

-- CreateIndex
CREATE INDEX "character_sheets_overrideRoleId_idx" ON "character_sheets"("overrideRoleId");

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_overrideClassId_fkey" FOREIGN KEY ("overrideClassId") REFERENCES "player_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_overrideRoleId_fkey" FOREIGN KEY ("overrideRoleId") REFERENCES "player_class_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
