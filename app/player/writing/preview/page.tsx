import type { Metadata } from "next";
import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Aperçu de la trame",
};
import { CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { PersonalTrameReader } from "@/components/player/personal-trame-reader";
import { LockedFeatureCard } from "@/components/locked-feature-card";

export default async function WritingPlayerPreviewPage(props: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  const user = await requireActivePlayer();
  const searchParams = await props.searchParams;
  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  const character = await prisma.characterSheet.findFirst({
    where: {
      playerId: user.id,
      ...(searchParams.characterId
        ? { id: searchParams.characterId }
        : unlocked
          ? { status: CharacterStatus.ACTIVE }
          : {}),
      ...(unlocked ? {} : { chapters: { some: { playerId: user.id } } }),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  if (!unlocked && !character) {
    return <LockedFeatureCard />;
  }

  const chapters = await prisma.chapter.findMany({
    where: {
      playerId: user.id,
      ...(character ? { characterSheetId: character.id } : {}),
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, content: true, order: true },
  });

  const playerName = user.minecraftUsername ?? user.discordDisplayName;
  return (
    <PersonalTrameReader
      backHref={character ? `/player/writing?characterId=${character.id}` : "/player/writing"}
      playerName={playerName}
      characterName={character?.name}
      chapters={chapters}
    />
  );
}
