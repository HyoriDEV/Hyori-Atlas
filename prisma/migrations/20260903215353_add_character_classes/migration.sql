-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('NOBLE', 'PAYSAN', 'PECHEUR', 'MINEUR', 'ERUDIT');

-- AlterEnum
ALTER TYPE "CharacterSheetCommentTarget" ADD VALUE 'chosenClasses';

-- AlterTable
ALTER TABLE "character_sheets" ADD COLUMN     "chosenClasses" "CharacterClass"[] DEFAULT ARRAY[]::"CharacterClass"[];

-- AlterTable
ALTER TABLE "global_settings" ALTER COLUMN "minecraftServerAddress" SET DEFAULT 'auth.hyori-rp.fr';
