import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader } from "@/components/dashboard/chapter-reader";
import { ChapterSelect } from "@/components/dashboard/chapter-select";
import { LockedFeatureCard } from "@/components/locked-feature-card";

export default async function WritingPlayerPreviewPage() {
  const user = await requireActivePlayer();
  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  if (!unlocked) {
    return <LockedFeatureCard />;
  }

  const chapters = await prisma.chapter.findMany({
    where: { playerId: user.id },
    orderBy: { order: "asc" },
  });

  const playerName = user.minecraftUsername ?? user.discordDisplayName;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AtlasBackButton href="/player/writing" />
          <h1 className="font-heading truncate text-lg font-semibold">
            Trame écrite de {playerName}
          </h1>
        </div>
        {chapters.length > 0 && <ChapterSelect chapters={chapters} />}
      </div>

      <ChapterReader chapters={chapters} />
    </div>
  );
}
