-- 1. Remove spoiler index and columns
DROP INDEX IF EXISTS "tickets_isSpoiler_status_lastMessageAt_idx";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "isSpoiler";
ALTER TABLE "ticket_category_configs" DROP COLUMN IF EXISTS "allowSpoiler";

-- 2. Migrate TicketCategory enum from OPEN/SECRET to RP/TECHNIQUE
ALTER TABLE "tickets" ALTER COLUMN "category" DROP DEFAULT;

-- Add new values if not existing
DO $$ BEGIN
  ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'RP';
  ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'TECHNIQUE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update tickets category based on categoryName
UPDATE "tickets"
SET "category" = CASE
  WHEN "categoryName" ILIKE '%technique%' THEN 'TECHNIQUE'::"TicketCategory"
  ELSE 'RP'::"TicketCategory"
END;

ALTER TABLE "tickets" ALTER COLUMN "category" SET DEFAULT 'RP'::"TicketCategory";

-- 3. Remove notification template override columns
ALTER TABLE "discord_notification_templates" DROP COLUMN IF EXISTS "title";
ALTER TABLE "discord_notification_templates" DROP COLUMN IF EXISTS "description";
ALTER TABLE "discord_notification_templates" DROP COLUMN IF EXISTS "buttonLabel";
ALTER TABLE "discord_notification_templates" DROP COLUMN IF EXISTS "buttonUrl";

-- 4. Clarify ticket category names (Roleplay -> Ticket RP, Technique -> Ticket technique)
ALTER TABLE "tickets" ALTER COLUMN "categoryName" SET DEFAULT 'Ticket RP';

UPDATE "ticket_category_configs"
SET "name" = 'Ticket RP'
WHERE "slug" = 'rp' AND "name" = 'Roleplay';

UPDATE "ticket_category_configs"
SET "name" = 'Ticket technique'
WHERE "slug" = 'technique' AND "name" = 'Technique';

UPDATE "tickets"
SET "categoryName" = 'Ticket RP'
WHERE "categoryName" = 'Roleplay';

UPDATE "tickets"
SET "categoryName" = 'Ticket technique'
WHERE "categoryName" = 'Technique';


