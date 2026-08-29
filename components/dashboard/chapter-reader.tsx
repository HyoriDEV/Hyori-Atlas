import DOMPurify from "isomorphic-dompurify";

import { Card, CardContent } from "@/components/ui/card";

export function ChapterReader({
  chapters,
}: {
  chapters: { id: string; title: string; content: string }[];
}) {
  if (chapters.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-base font-medium">Aucun chapitre pour l&apos;instant.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {chapters.map((chapter) => (
        <Card key={chapter.id} className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">{chapter.title}</h2>
          <div
            className="chapter-content"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapter.content) }}
          />
        </Card>
      ))}
    </div>
  );
}
