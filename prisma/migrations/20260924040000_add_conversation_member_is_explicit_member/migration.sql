-- AlterTable
ALTER TABLE "conversation_members" ADD COLUMN "isExplicitMember" BOOLEAN NOT NULL DEFAULT true;

-- For tickets, set isExplicitMember = false for staff members who are not the ticket creator
UPDATE "conversation_members" cm
SET "isExplicitMember" = false
FROM "conversations" c
JOIN "tickets" t ON t."conversationId" = c."id"
JOIN "users" u ON u."id" = cm."userId"
WHERE cm."conversationId" = c."id"
  AND cm."userId" != t."playerId"
  AND u."role" != 'PLAYER';
