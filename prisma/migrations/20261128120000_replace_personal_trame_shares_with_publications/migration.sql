-- DropTable
DROP TABLE "personal_trame_shares";

-- CreateTable
CREATE TABLE "personal_trame_publications" (
    "characterSheetId" TEXT NOT NULL,
    "token" VARCHAR(43) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "personal_trame_publications_pkey" PRIMARY KEY ("characterSheetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_trame_publications_token_key" ON "personal_trame_publications"("token");

-- AddForeignKey
ALTER TABLE "personal_trame_publications" ADD CONSTRAINT "personal_trame_publications_characterSheetId_fkey" FOREIGN KEY ("characterSheetId") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
