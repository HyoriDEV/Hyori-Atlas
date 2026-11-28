import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { ChapterReader, type ChapterItem } from "@/components/dashboard/chapter-reader";

export function PersonalTrameReader({
  backHref,
  title,
  chapters,
}: {
  backHref?: string;
  title: string;
  chapters: ChapterItem[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        {backHref && <AtlasBackButton href={backHref} className="shrink-0" />}
        <h1 className="font-heading min-w-0 text-lg font-semibold">{title}</h1>
      </div>
      <ChapterReader chapters={chapters} />
    </div>
  );
}
