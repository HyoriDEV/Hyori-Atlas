-- 1. Create ticket_category_configs table
CREATE TABLE IF NOT EXISTS "ticket_category_configs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "icon" VARCHAR(50),
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_category_configs_pkey" PRIMARY KEY ("id")
);

-- Unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_category_configs_slug_key" ON "ticket_category_configs"("slug");

-- 2. Create ticket_subcategory_configs table
CREATE TABLE IF NOT EXISTS "ticket_subcategory_configs" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "placeholderSubject" VARCHAR(200),
    "placeholderDescription" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_subcategory_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_subcategory_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_category_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique index on categoryId + slug
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_subcategory_configs_categoryId_slug_key" ON "ticket_subcategory_configs"("categoryId", "slug");

-- 3. Add columns to tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "categoryName" VARCHAR(100) NOT NULL DEFAULT 'Roleplay';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "subcategoryName" VARCHAR(100);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "isSpoiler" BOOLEAN NOT NULL DEFAULT false;

-- Foreign keys on tickets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_categoryId_fkey'
  ) THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_category_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_subcategoryId_fkey'
  ) THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ticket_subcategory_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "tickets_categoryId_status_lastMessageAt_idx" ON "tickets"("categoryId", "status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "tickets_isSpoiler_status_lastMessageAt_idx" ON "tickets"("isSpoiler", "status", "lastMessageAt");

-- 4. Seed default categories if they don't exist
INSERT INTO "ticket_category_configs" ("id", "slug", "name", "description", "icon", "order", "enabled", "allowSpoiler", "allowedRoles", "createdAt", "updatedAt")
VALUES
  ('cat_rp', 'rp', 'Roleplay', 'Demandes liées au roleplay, projets et intégration', 'scroll', 0, true, true, ARRAY['ADMIN', 'HELPER', 'CONFLICT_MANAGEMENT', 'RP_TRACKING', 'EVENT', 'DEVELOPER']::"Role"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_tech', 'technique', 'Technique', 'Dysfonctionnements, bugs et suggestions pour l''équipe technique', 'wrench', 1, true, false, ARRAY['ADMIN', 'DEVELOPER']::"Role"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "allowSpoiler" = EXCLUDED."allowSpoiler",
  "allowedRoles" = EXCLUDED."allowedRoles";

-- 5. Seed default subcategories
INSERT INTO "ticket_subcategory_configs" ("id", "categoryId", "slug", "name", "description", "order", "enabled", "placeholderSubject", "placeholderDescription", "createdAt", "updatedAt")
VALUES
  ('subcat_rp_tracking', 'cat_rp', 'rp_tracking', 'Demande suivi RP', 'Projets de personnage, lore, validations d''actions RP (assassinats, captures, mort définitive).', 0, true, 'Ex: Demande de validation pour un projet de commerce...', 'Détaillez votre projet, vos motivations RP et les personnages impliqués...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subcat_whitelist', 'cat_rp', 'whitelist', 'Question liée à la whitelist', 'Interrogations sur la candidature, l''entretien vocal ou l''intégration.', 1, true, 'Ex: Question concernant mon entretien vocal...', 'Posez votre question concernant votre intégration sur le serveur...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subcat_complaint', 'cat_rp', 'plainte', 'Plainte contre un joueur', 'Signalement d''un manquement au règlement, litige RP ou comportement inapproprié.', 2, true, 'Ex: Signalement d''un comportement anti-RP...', 'Expliquez la situation en détail, les personnes impliquées et joignez les preuves éventuelles...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subcat_bug', 'cat_tech', 'bug', 'Report de bug', 'Dysfonctionnements en jeu (items, quêtes, plugins) ou sur le site web.', 0, true, 'Ex: Problème d''affichage sur la page de profil...', 'Décrivez les étapes précises pour reproduire le bug observé...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subcat_suggestion', 'cat_tech', 'suggestion', 'Suggestion', 'Idées d''amélioration du gameplay, ajouts de fonctionnalités ou équilibrage.', 1, true, 'Ex: Suggestion d''amélioration du système de métier...', 'Décrivez votre proposition et ce qu''elle apporterait à la communauté...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("categoryId", "slug") DO NOTHING;

-- 6. Migrate existing tickets safely using old_category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'old_category'
  ) THEN
    -- Migration rétroactive intelligente selon l'ancienne catégorie
    UPDATE "tickets"
    SET
      "categoryId" = CASE
        WHEN "old_category" = 'BUG_REPORT' THEN 'cat_tech'
        ELSE 'cat_rp'
      END,
      "subcategoryId" = CASE
        WHEN "old_category" = 'BUG_REPORT' THEN 'subcat_bug'
        WHEN "old_category" = 'WHITELIST' THEN 'subcat_whitelist'
        WHEN "old_category" = 'PLAYER_COMPLAINT' THEN 'subcat_complaint'
        ELSE 'subcat_rp_tracking'
      END,
      "categoryName" = CASE
        WHEN "old_category" = 'BUG_REPORT' THEN 'Technique'
        ELSE 'Roleplay'
      END,
      "subcategoryName" = CASE
        WHEN "old_category" = 'BUG_REPORT' THEN 'Report de bug'
        WHEN "old_category" = 'WHITELIST' THEN 'Question liée à la whitelist'
        WHEN "old_category" = 'PLAYER_COMPLAINT' THEN 'Plainte contre un joueur'
        ELSE 'Demande suivi RP'
      END,
      "isSpoiler" = false
    WHERE "categoryId" IS NULL;

    -- Nettoyage de la colonne temporaire
    ALTER TABLE "tickets" DROP COLUMN IF EXISTS "old_category";
  ELSE
    -- Repli si old_category n'existe pas
    UPDATE "tickets"
    SET
      "categoryId" = 'cat_rp',
      "subcategoryId" = 'subcat_rp_tracking',
      "categoryName" = 'Roleplay',
      "subcategoryName" = 'Demande suivi RP',
      "isSpoiler" = false
    WHERE "categoryId" IS NULL;
  END IF;
END $$;

