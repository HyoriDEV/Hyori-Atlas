import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PersonalTrameReader } from "@/components/player/personal-trame-reader";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trame partagée" };

export default async function PublishedTramePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();

  const publication = await prisma.personalTramePublication.findUnique({
    where: { token, enabled: true },
    select: { characterSheet: { select: { id: true, name: true, playerId: true } } },
  });
  if (!publication) notFound();

  const character = publication.characterSheet;
  const chapters = await prisma.chapter.findMany({
    where: {
      characterSheetId: character.id,
      playerId: character.playerId,
      characterSheet: { tramePublication: { token, enabled: true } },
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { title: true, content: true },
  });
  if (!chapters.length) notFound();

  return (
    <main className="mx-auto flex h-dvh w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <PersonalTrameReader
        title={character.name ? `Trame de ${character.name}` : "Trame partagée"}
        chapters={chapters.map((chapter, index) => ({ ...chapter, id: String(index + 1) }))}
      />
    </main>
  );
}
