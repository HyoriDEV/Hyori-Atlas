-- DropForeignKey
ALTER TABLE "ticket_team_summons" DROP CONSTRAINT IF EXISTS "ticket_team_summons_ticketId_fkey";
ALTER TABLE "ticket_team_summons" DROP CONSTRAINT IF EXISTS "ticket_team_summons_summonedById_fkey";
ALTER TABLE "ticket_staff_accesses" DROP CONSTRAINT IF EXISTS "ticket_staff_accesses_ticketId_fkey";
ALTER TABLE "ticket_staff_accesses" DROP CONSTRAINT IF EXISTS "ticket_staff_accesses_userId_fkey";
ALTER TABLE "ticket_staff_accesses" DROP CONSTRAINT IF EXISTS "ticket_staff_accesses_addedById_fkey";

-- DropTable
DROP TABLE IF EXISTS "ticket_team_summons";
DROP TABLE IF EXISTS "ticket_staff_accesses";

