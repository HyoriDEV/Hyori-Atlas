import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DEV_TEST_USERS } from "./seeds/dev-users";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const user of DEV_TEST_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordDisplayName: user.discordDisplayName,
        discordAvatarUrl: user.discordAvatarUrl,
        role: user.role,
        registrationStatus: user.registrationStatus,
      },
    });
  }

  await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
