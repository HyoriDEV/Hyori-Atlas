-- AlterTable
ALTER TABLE "conversation_members" ADD COLUMN "isExplicitMember" BOOLEAN NOT NULL DEFAULT true;

-- For tickets, set isExplicitMember = false for staff members who are not the ticket creator
UPDATE "conversation_members"
SET "isExplicitMember" = false
WHERE "userId" NOT IN (
    SELECT t."playerId"
    FROM "tickets" t
    WHERE t."conversationId" = "conversation_members"."conversationId"
)
AND "userId" IN (
    SELECT u."id"
    FROM "users" u
    WHERE u."role" != 'PLAYER'
)
AND "conversationId" IN (
    SELECT t."conversationId"
    FROM "tickets" t
);
