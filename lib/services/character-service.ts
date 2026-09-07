import { prisma } from "@/lib/prisma";
import { CharacterStatus } from "@/lib/generated/prisma/enums";

export async function getActiveCharacter(playerId: string) {
  return await prisma.characterSheet.findFirst({
    where: { playerId, status: CharacterStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    include: {
      comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
      reviewHistory: { orderBy: { createdAt: "desc" }, include: { author: true } },
    },
  });
}

export async function getPlayerCharacters(playerId: string) {
  return await prisma.characterSheet.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    include: {
      comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
      reviewHistory: { orderBy: { createdAt: "desc" }, include: { author: true } },
      _count: { select: { chapters: true, comments: true } },
    },
  });
}

export async function getCharacterById(characterId: string) {
  return await prisma.characterSheet.findUnique({
    where: { id: characterId },
    include: {
      player: true,
      comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
      reviewHistory: { orderBy: { createdAt: "desc" }, include: { author: true } },
      chapters: { orderBy: { order: "asc" } },
    },
  });
}
