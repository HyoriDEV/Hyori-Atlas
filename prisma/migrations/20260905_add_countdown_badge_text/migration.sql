-- AlterTable
ALTER TABLE "global_settings"
ADD COLUMN IF NOT EXISTS "countdownBadgeText" TEXT DEFAULT 'Hyori RP — Lancement Officiel';
