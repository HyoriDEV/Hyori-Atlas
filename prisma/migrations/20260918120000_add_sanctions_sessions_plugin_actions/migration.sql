-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('WARNING', 'SUSPENSION', 'EXCLUSION');

-- CreateEnum
CREATE TYPE "SanctionSource" AS ENUM ('WEB', 'GAME');

-- CreateEnum
CREATE TYPE "PluginActionType" AS ENUM ('KICK', 'SANCTION');

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SanctionType" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "source" "SanctionSource" NOT NULL,
    "issuedById" TEXT,
    "issuedByName" VARCHAR(64),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedByName" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "minecraftUuid" TEXT NOT NULL,
    "minecraftUsername" VARCHAR(16) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_actions" (
    "id" TEXT NOT NULL,
    "type" "PluginActionType" NOT NULL,
    "targetUuid" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "plugin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanctions_userId_revokedAt_idx" ON "sanctions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "game_sessions_minecraftUuid_idx" ON "game_sessions"("minecraftUuid");

-- CreateIndex
CREATE INDEX "game_sessions_userId_connectedAt_idx" ON "game_sessions"("userId", "connectedAt");

-- CreateIndex
CREATE INDEX "plugin_actions_acknowledgedAt_createdAt_idx" ON "plugin_actions"("acknowledgedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

