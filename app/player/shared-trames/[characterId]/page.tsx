import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PersonalTrameReader } from "@/components/player/personal-trame-reader";
import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Trame partagée" };

export default async function SharedTramePage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const [user, { characterId }] = await Promise.all([requireActivePlayer(), params]);
  const character = await prisma.characterSheet.findFirst({
    where: { id: characterId, trameShares: { some: { recipientId: user.id } } },
    select: {
      id: true,
      name: true,
      playerId: true,
      player: { select: { minecraftUsername: true, discordDisplayName: true } },
    },
  });
  if (!character) notFound();

  const chapters = await prisma.chapter.findMany({
    where: {
      playerId: character.playerId,
      characterSheetId: character.id,
      characterSheet: { trameShares: { some: { recipientId: user.id } } },
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, content: true, order: true },
  });
  if (chapters.length === 0) notFound();

  return (
    <PersonalTrameReader
      backHref="/player/shared-trames"
      playerName={character.player.minecraftUsername ?? character.player.discordDisplayName}
      characterName={character.name}
      chapters={chapters}
    />
  );
}
