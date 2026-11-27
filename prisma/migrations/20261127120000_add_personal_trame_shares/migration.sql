-- CreateTable
CREATE TABLE "personal_trame_shares" (
    "characterSheetId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "personal_trame_shares_pkey" PRIMARY KEY ("characterSheetId","recipientId")
);

-- CreateIndex
CREATE INDEX "personal_trame_shares_recipientId_idx" ON "personal_trame_shares"("recipientId");

-- AddForeignKey
ALTER TABLE "personal_trame_shares" ADD CONSTRAINT "personal_trame_shares_characterSheetId_fkey" FOREIGN KEY ("characterSheetId") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_trame_shares" ADD CONSTRAINT "personal_trame_shares_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
