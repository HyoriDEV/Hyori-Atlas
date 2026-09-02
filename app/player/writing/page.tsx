import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ChapterWorkspace } from "@/components/player/chapter-workspace";
import { getGlobalSettings } from "@/lib/services/settings-service";

export default async function WritingPage() {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();
  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  const chapters = unlocked
    ? await prisma.chapter.findMany({
        where: { playerId: user.id },
        orderBy: { order: "asc" },
      })
    : [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Écriture de trame</h1>
        {unlocked && chapters.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-2 text-xs font-medium shadow-xs sm:text-sm"
            render={<Link href="/player/writing/preview" />}
          >
            <BookOpen className="text-primary size-4" />
            <span>Prévisualiser</span>
          </Button>
        )}
      </div>
      {unlocked ? (
        <ChapterWorkspace
          chapterWritingEnabled={settings.chapterWritingEnabled}
          initialChapters={chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            order: chapter.order,
          }))}
        />
      ) : (
        <LockedFeatureCard />
      )}
    </div>
  );
}
