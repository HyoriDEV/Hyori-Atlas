-- 1. Ajout des nouvelles valeurs OPEN et SECRET dans l'enum TicketCategory
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'SECRET';

-- 2. Mise à jour de tous les tickets existants vers OPEN
UPDATE "tickets" SET "category" = 'OPEN';

-- 3. Mise à jour de la valeur par défaut
ALTER TABLE "tickets" ALTER COLUMN "category" SET DEFAULT 'OPEN';

-- 4. Ajout de l'index combiné sur category, status, lastMessageAt
CREATE INDEX IF NOT EXISTS "tickets_category_status_lastMessageAt_idx" ON "tickets"("category", "status", "lastMessageAt");

