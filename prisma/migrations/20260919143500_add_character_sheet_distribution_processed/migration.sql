-- AlterTable
ALTER TABLE "character_sheets" ADD COLUMN "distributionProcessed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "character_sheets_distributionProcessed_idx" ON "character_sheets"("distributionProcessed");
