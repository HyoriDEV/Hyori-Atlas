-- CreateEnum
CREATE TYPE "GalleryCategory" AS ENUM ('PAYSAGE', 'SCENE_RP', 'PORTRAIT', 'ARCHITECTURE', 'EVENEMENT');

-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "gallerySubmissionsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "galleryAutoApprove" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "galleryMaxDailyUploads" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "imageUrl" VARCHAR(500) NOT NULL,
    "thumbnailUrl" VARCHAR(500) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "category" "GalleryCategory" NOT NULL DEFAULT 'PAYSAGE',
    "location" VARCHAR(100),
    "shader" VARCHAR(100),
    "status" "GalleryStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(500),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_likes" (
    "id" TEXT NOT NULL,
    "galleryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_tagged_users" (
    "galleryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "gallery_tagged_users_pkey" PRIMARY KEY ("galleryItemId","userId")
);

-- CreateIndex
CREATE INDEX "gallery_items_status_createdAt_idx" ON "gallery_items"("status", "createdAt");

-- CreateIndex
CREATE INDEX "gallery_items_authorId_idx" ON "gallery_items"("authorId");

-- CreateIndex
CREATE INDEX "gallery_items_isFeatured_idx" ON "gallery_items"("isFeatured");

-- CreateIndex
CREATE INDEX "gallery_items_category_idx" ON "gallery_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_likes_galleryItemId_userId_key" ON "gallery_likes"("galleryItemId", "userId");

-- CreateIndex
CREATE INDEX "gallery_likes_userId_idx" ON "gallery_likes"("userId");

-- CreateIndex
CREATE INDEX "gallery_tagged_users_userId_idx" ON "gallery_tagged_users"("userId");

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_likes" ADD CONSTRAINT "gallery_likes_galleryItemId_fkey" FOREIGN KEY ("galleryItemId") REFERENCES "gallery_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_likes" ADD CONSTRAINT "gallery_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_tagged_users" ADD CONSTRAINT "gallery_tagged_users_galleryItemId_fkey" FOREIGN KEY ("galleryItemId") REFERENCES "gallery_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_tagged_users" ADD CONSTRAINT "gallery_tagged_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
