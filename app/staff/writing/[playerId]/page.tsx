import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(props: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await props.params;
  const player = await prisma.user.findUnique({
    where: { id: playerId },
    select: { minecraftUsername: true, discordDisplayName: true, discordUsername: true },
  });

  const playerName =
    player?.minecraftUsername || player?.discordDisplayName || player?.discordUsername;
  return {
    title: playerName ? `Écrits de ${playerName}` : "Écrits du joueur",
  };
}
import { writingReviewerRoles, characterStatusLabels } from "@/lib/navigation";
import { characterStatusBadgeVariant } from "@/lib/atlas-status";
import { CharacterStatus } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader } from "@/components/dashboard/chapter-reader";
import { ChapterSelect } from "@/components/dashboard/chapter-select";
import { CharacterSwitcher } from "@/components/player/character-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";

export default async function WritingStaffDetailPage(props: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ characterId?: string }>;
}) {
  const { playerId } = await props.params;
  const searchParams = await props.searchParams;
  await requireRole(writingReviewerRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!player) {
    notFound();
  }

  const selectedCharacter =
    (searchParams.characterId
      ? player.characterSheets.find((c) => c.id === searchParams.characterId)
      : null) ??
    player.characterSheets.find((c) => c.status === CharacterStatus.ACTIVE) ??
    player.characterSheets[0] ??
    null;

  const chapters = await prisma.chapter.findMany({
    where: {
      playerId,
      ...(selectedCharacter ? { characterSheetId: selectedCharacter.id } : {}),
    },
    orderBy: { order: "asc" },
  });

  const playerName = player.minecraftUsername ?? player.discordDisplayName;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AtlasBackButton href={`/staff/atlas/${playerId}`} />
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href={`/staff/atlas/${playerId}`}
              className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-85"
              title={`Voir la fiche Atlas de ${playerName}`}
            >
              {player.minecraftUsername ? (
                <SkinHead size="sm" username={player.minecraftUsername} />
              ) : (
                <Avatar size="sm">
                  <AvatarImage src={player.discordAvatarUrl ?? undefined} alt={playerName} />
                  <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <h1 className="font-heading text-lg font-semibold hover:underline">
                Trame écrite de {playerName}
              </h1>
            </Link>
            {selectedCharacter && (
              <Badge
                variant={characterStatusBadgeVariant(selectedCharacter.status)}
                className="text-xs"
              >
                {selectedCharacter.name || "Nouveau personnage"} (
                {characterStatusLabels[selectedCharacter.status]})
              </Badge>
            )}
          </div>
        </div>
        {chapters.length > 0 && <ChapterSelect chapters={chapters} />}
      </div>

      {player.characterSheets.length > 1 && selectedCharacter && (
        <CharacterSwitcher
          characters={player.characterSheets.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            reviewStatus: c.reviewStatus,
            createdAt: c.createdAt,
          }))}
          selectedCharacterId={selectedCharacter.id}
        />
      )}

      <ChapterReader chapters={chapters} />
    </div>
  );
}
