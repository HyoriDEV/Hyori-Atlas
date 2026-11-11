-- 1. Remove spoiler index and columns
DROP INDEX IF EXISTS "tickets_isSpoiler_status_lastMessageAt_idx";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "isSpoiler";
ALTER TABLE "ticket_category_configs" DROP COLUMN IF EXISTS "allowSpoiler";

-- 2. Migrate TicketCategory enum from OPEN/SECRET to RP/TECHNIQUE
ALTER TABLE "tickets" ALTER COLUMN "category" DROP DEFAULT;
DROP INDEX IF EXISTS "tickets_category_status_lastMessageAt_idx";

-- Temporarily convert tickets.category to text to safely replace enum values
ALTER TABLE "tickets" ALTER COLUMN "category" TYPE text USING "category"::text;

-- Update tickets category text based on categoryName
UPDATE "tickets"
SET "category" = CASE
  WHEN "categoryName" ILIKE '%technique%' THEN 'TECHNIQUE'
  ELSE 'RP'
END;

-- Recreate TicketCategory enum with values RP and TECHNIQUE
DROP TYPE IF EXISTS "TicketCategory" CASCADE;
CREATE TYPE "TicketCategory" AS ENUM ('RP', 'TECHNIQUE');

-- Convert tickets.category column back to TicketCategory enum
ALTER TABLE "tickets" ALTER COLUMN "category" TYPE "TicketCategory" USING "category"::"TicketCategory";
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


