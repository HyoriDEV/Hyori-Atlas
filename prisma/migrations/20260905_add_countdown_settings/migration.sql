-- AlterTable
ALTER TABLE "global_settings"
ADD COLUMN IF NOT EXISTS "countdownEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "countdownTitle" TEXT NOT NULL DEFAULT 'Lancement Officiel de Hyori RP',
ADD COLUMN IF NOT EXISTS "countdownSubtitle" TEXT DEFAULT 'Le compte à rebours est lancé. Préparez-vous à entrer dans l''histoire.',
ADD COLUMN IF NOT EXISTS "countdownTargetDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "countdownVideoType" TEXT NOT NULL DEFAULT 'URL',
ADD COLUMN IF NOT EXISTS "countdownVideoUrl" TEXT;
