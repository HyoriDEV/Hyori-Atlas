import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getGlobalSettings = cache(async () => {
  let settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: "global" },
    });
  }

  return settings;
});

export async function updateGlobalSettings(
  data: Partial<
    Omit<import("@/lib/generated/prisma/client").GlobalSettings, "id" | "updatedAt" | "updatedBy">
  >,
  userId: string
) {
  return await prisma.globalSettings.update({
    where: { id: "global" },
    data: {
      ...data,
      updatedById: userId,
    },
  });
}
