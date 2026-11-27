import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader, type ChapterItem } from "@/components/dashboard/chapter-reader";

export function PersonalTrameReader({
  backHref,
  playerName,
  characterName,
  chapters,
}: {
  backHref: string;
  playerName: string;
  characterName?: string | null;
  chapters: ChapterItem[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <AtlasBackButton href={backHref} className="shrink-0" />
        <h1 className="font-heading min-w-0 text-lg font-semibold">
          Trame écrite de {playerName}
          {characterName && ` — ${characterName}`}
        </h1>
      </div>
      <ChapterReader chapters={chapters} />
    </div>
  );
}
