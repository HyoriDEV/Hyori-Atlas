import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ChapterWorkspace } from "@/components/player/chapter-workspace";

export default async function WritingPage() {
  const user = await requireActivePlayer();
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
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Écriture de trame</h1>
      {unlocked ? (
        <ChapterWorkspace
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
