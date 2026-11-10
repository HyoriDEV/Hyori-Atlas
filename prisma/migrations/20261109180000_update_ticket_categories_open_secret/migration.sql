-- 1. Sauvegarde de l'ancienne catégorie textuelle avant écrasement
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "old_category" TEXT;
UPDATE "tickets" SET "old_category" = "category"::text WHERE "old_category" IS NULL;

-- 2. Ajout des nouvelles valeurs OPEN et SECRET dans l'enum TicketCategory
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'SECRET';

-- 3. Mise à jour de tous les tickets existants vers OPEN
UPDATE "tickets" SET "category" = 'OPEN';

-- 4. Mise à jour de la valeur par défaut
ALTER TABLE "tickets" ALTER COLUMN "category" SET DEFAULT 'OPEN';

-- 5. Ajout de l'index combiné sur category, status, lastMessageAt
CREATE INDEX IF NOT EXISTS "tickets_category_status_lastMessageAt_idx" ON "tickets"("category", "status", "lastMessageAt");


