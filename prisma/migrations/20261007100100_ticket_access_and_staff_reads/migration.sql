-- CreateTable
CREATE TABLE "ticket_team_summons" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "team" "Role" NOT NULL,
    "summonedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_team_summons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_staff_accesses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_staff_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_reads" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Reprise : les convocations Suivi RP existantes deviennent des lignes de convocation d'équipe
INSERT INTO "ticket_team_summons" ("id", "ticketId", "team")
SELECT md5(random()::text || clock_timestamp()::text || t."id"), t."id", 'RP_TRACKING'::"Role"
FROM "tickets" t
WHERE t."rpTrackingAccess" = true;

-- Reprise : date du dernier message non supprimé de chaque ticket
UPDATE "tickets" t
SET "lastMessageAt" = COALESCE(
  (
    SELECT MAX(m."createdAt")
    FROM "conversation_messages" m
    WHERE m."conversationId" = t."conversationId" AND m."deletedAt" IS NULL
  ),
  t."createdAt"
);

-- Reprise : la lecture du staff quitte conversation_members (où elle créait une appartenance)
INSERT INTO "conversation_reads" ("id", "conversationId", "userId", "lastReadAt")
SELECT
  md5(random()::text || clock_timestamp()::text || cm."id"),
  cm."conversationId",
  cm."userId",
  COALESCE(cm."lastReadAt", cm."joinedAt")
FROM "conversation_members" cm
JOIN "users" u ON u."id" = cm."userId"
WHERE u."role" <> 'PLAYER';

-- Tickets : un staff ne reste membre que s'il est le créateur du ticket
DELETE FROM "conversation_members" cm
USING "users" u, "tickets" t
WHERE u."id" = cm."userId"
  AND t."conversationId" = cm."conversationId"
  AND u."role" <> 'PLAYER'
  AND t."playerId" <> cm."userId";

-- Suivi RP : un staff ne reste membre que s'il est le propriétaire (premier membre) de la conversation
DELETE FROM "conversation_members" cm
USING "users" u, "conversations" c
WHERE u."id" = cm."userId"
  AND c."id" = cm."conversationId"
  AND c."type" = 'RP_TRACKING'
  AND u."role" <> 'PLAYER'
  AND cm."id" <> (
    SELECT cm2."id"
    FROM "conversation_members" cm2
    WHERE cm2."conversationId" = cm."conversationId"
    ORDER BY cm2."joinedAt" ASC, cm2."id" ASC
    LIMIT 1
  );

-- Reprise : le modèle Discord de convocation Suivi RP devient le modèle par équipe
UPDATE "discord_notification_templates"
SET "id" = 'TICKET_SUMMONED_RP_TRACKING'
WHERE "id" = 'TICKET_RP_STAFF_SUMMONED';

-- DropIndex
DROP INDEX "tickets_rpTrackingAccess_idx";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "rpTrackingAccess";

-- CreateIndex
CREATE INDEX "ticket_team_summons_team_idx" ON "ticket_team_summons"("team");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_team_summons_ticketId_team_key" ON "ticket_team_summons"("ticketId", "team");

-- CreateIndex
CREATE INDEX "ticket_staff_accesses_userId_idx" ON "ticket_staff_accesses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_staff_accesses_ticketId_userId_key" ON "ticket_staff_accesses"("ticketId", "userId");

-- CreateIndex
CREATE INDEX "conversation_reads_userId_idx" ON "conversation_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_reads_conversationId_userId_key" ON "conversation_reads"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "tickets_status_lastMessageAt_idx" ON "tickets"("status", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "ticket_team_summons" ADD CONSTRAINT "ticket_team_summons_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_team_summons" ADD CONSTRAINT "ticket_team_summons_summonedById_fkey" FOREIGN KEY ("summonedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_staff_accesses" ADD CONSTRAINT "ticket_staff_accesses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_staff_accesses" ADD CONSTRAINT "ticket_staff_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_staff_accesses" ADD CONSTRAINT "ticket_staff_accesses_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
