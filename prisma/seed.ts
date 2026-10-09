import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DEV_TEST_USERS } from "./seeds/dev-users";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Handle any legacy dev user ID renames (e.g. 'communication' -> 'helper')
  const legacyIdMap: Record<string, string> = {
    helper: "communication",
  };

  for (const [newId, oldId] of Object.entries(legacyIdMap)) {
    const oldUser = await prisma.user.findUnique({ where: { id: oldId } });
    if (oldUser) {
      const newUser = await prisma.user.findUnique({ where: { id: newId } });
      if (!newUser) {
        await prisma.user.update({
          where: { id: oldId },
          data: { id: newId },
        });
      } else {
        await prisma.user.delete({ where: { id: oldId } });
      }
    }
  }

  for (const user of DEV_TEST_USERS) {
    const existingByDiscord = await prisma.user.findUnique({
      where: { discordId: user.discordId },
    });

    if (existingByDiscord && existingByDiscord.id !== user.id) {
      const existingById = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!existingById) {
        await prisma.user.update({
          where: { id: existingByDiscord.id },
          data: {
            id: user.id,
            discordUsername: user.discordUsername,
            discordDisplayName: user.discordDisplayName,
            discordAvatarUrl: user.discordAvatarUrl,
            role: user.role,
            registrationStatus: user.registrationStatus,
          },
        });
        continue;
      } else {
        await prisma.user.delete({
          where: { id: existingByDiscord.id },
        });
      }
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordDisplayName: user.discordDisplayName,
        discordAvatarUrl: user.discordAvatarUrl,
        role: user.role,
        registrationStatus: user.registrationStatus,
      },
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

  const defaultBacklogLabels = [
    { name: "Bug", color: "red" },
    { name: "Fonctionnalité", color: "blue" },
    { name: "Plugin", color: "green" },
    { name: "Atlas", color: "violet" },
    { name: "Bot", color: "amber" },
  ];

  if ((await prisma.backlogLabel.count()) === 0) {
    await prisma.backlogLabel.createMany({ data: defaultBacklogLabels });
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
