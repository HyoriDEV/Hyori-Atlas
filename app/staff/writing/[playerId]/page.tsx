import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { writingReviewerRoles } from "@/lib/navigation";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader } from "@/components/dashboard/chapter-reader";
import { ChapterSelect } from "@/components/dashboard/chapter-select";

export default async function WritingStaffDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  await requireRole(writingReviewerRoles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!player) {
    notFound();
  }

  const playerName = player.minecraftUsername ?? player.discordDisplayName;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AtlasBackButton href="/staff/writing" />
          <h1 className="font-heading truncate text-lg font-semibold">
            Trame écrite de {playerName}
          </h1>
        </div>
        {player.chapters.length > 0 && <ChapterSelect chapters={player.chapters} />}
      </div>

      <ChapterReader chapters={player.chapters} />
    </div>
  );
}
