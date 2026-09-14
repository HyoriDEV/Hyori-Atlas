-- AlterTable
ALTER TABLE "users" ADD COLUMN "rpGroupId" TEXT;

-- CreateTable
CREATE TABLE "rp_groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "rp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_rpGroupId_idx" ON "users"("rpGroupId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rpGroupId_fkey" FOREIGN KEY ("rpGroupId") REFERENCES "rp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_groups" ADD CONSTRAINT "rp_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
