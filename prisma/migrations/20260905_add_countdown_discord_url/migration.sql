-- AlterTable
ALTER TABLE "global_settings"
ADD COLUMN IF NOT EXISTS "countdownDiscordUrl" TEXT DEFAULT 'https://discord.gg/hyori';
