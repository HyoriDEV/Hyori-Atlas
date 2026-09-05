-- CreateTable
CREATE TABLE "rule_sections" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_articles" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_items" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rule_articles_sectionId_idx" ON "rule_articles"("sectionId");

-- CreateIndex
CREATE INDEX "rule_items_articleId_idx" ON "rule_items"("articleId");

-- AddForeignKey
ALTER TABLE "rule_articles" ADD CONSTRAINT "rule_articles_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "rule_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_items" ADD CONSTRAINT "rule_items_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "rule_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
