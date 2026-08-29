import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { writingReviewerRoles } from "@/lib/navigation";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader } from "@/components/dashboard/chapter-reader";

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AtlasBackButton href="/staff/writing" />
        <h1 className="font-heading flex-1 text-lg font-semibold">{playerName}</h1>
      </div>

      <ChapterReader chapters={player.chapters} />
    </div>
  );
}
