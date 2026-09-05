-- AlterTable
ALTER TABLE "global_settings" ADD COLUMN     "minecraftAuthCommand" TEXT NOT NULL DEFAULT 'auth',
ADD COLUMN     "minecraftServerAddress" TEXT NOT NULL DEFAULT 'link.hyorirp.fr',
ADD COLUMN     "minecraftServerVersion" TEXT NOT NULL DEFAULT '1.21.11';

-- CreateTable
CREATE TABLE "minecraft_auth_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minecraft_auth_attempts" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "minecraftUuid" TEXT,
    "minecraftUsername" TEXT,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_auth_codes_code_key" ON "minecraft_auth_codes"("code");

-- CreateIndex
CREATE INDEX "minecraft_auth_codes_userId_idx" ON "minecraft_auth_codes"("userId");

-- CreateIndex
CREATE INDEX "minecraft_auth_codes_code_idx" ON "minecraft_auth_codes"("code");

-- CreateIndex
CREATE INDEX "minecraft_auth_attempts_createdAt_idx" ON "minecraft_auth_attempts"("createdAt");

-- CreateIndex
CREATE INDEX "minecraft_auth_attempts_minecraftUuid_idx" ON "minecraft_auth_attempts"("minecraftUuid");

-- CreateIndex
CREATE INDEX "minecraft_auth_attempts_ipAddress_idx" ON "minecraft_auth_attempts"("ipAddress");

-- CreateIndex
CREATE INDEX "minecraft_auth_attempts_userId_idx" ON "minecraft_auth_attempts"("userId");

-- AddForeignKey
ALTER TABLE "minecraft_auth_codes" ADD CONSTRAINT "minecraft_auth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minecraft_auth_attempts" ADD CONSTRAINT "minecraft_auth_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
