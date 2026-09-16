-- AlterTable
ALTER TABLE "users" ADD COLUMN     "minecraftAvatarUrl" TEXT,
ADD COLUMN     "minecraftSkinModel" TEXT,
ADD COLUMN     "minecraftSkinUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "minecraftSkinUrl" TEXT;
