-- DropForeignKey
ALTER TABLE "minecraft_auth_attempts" DROP CONSTRAINT IF EXISTS "minecraft_auth_attempts_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "minecraft_auth_attempts";
