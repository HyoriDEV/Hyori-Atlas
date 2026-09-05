import { prisma } from "@/lib/prisma";
import { NewsType } from "@/lib/generated/prisma/enums";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

function NewsFeed({ items }: { items: Awaited<ReturnType<typeof getNews>> }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune publication pour le moment.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {items.map((item) => (
        <Card
          key={item.id}
          className="hover:border-primary/50 w-full overflow-hidden transition-all hover:shadow-md"
        >
          <CardHeader className="bg-muted/10 border-b p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-foreground text-2xl font-bold tracking-tight">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
                {item.excerpt}
              </p>
            </div>
            <div className="mt-4 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {formatDate(item.publishedAt, {
                  style: "prefix-long",
                  withTime: false,
                  withYear: true,
                })}
              </span>
              <Badge variant="secondary" className="font-semibold">
                {item.authorLabel}
              </Badge>
            </div>
          </CardHeader>
          {item.content && (
            <CardContent className="p-6 md:p-8">
              <div
                className="prose prose-zinc dark:prose-invert prose-headings:font-heading prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80 prose-p:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

async function getNews() {
  return prisma.news.findMany({ orderBy: { publishedAt: "desc" } });
}

export default async function NewsPage() {
  const news = await getNews();
  const announcements = news.filter((item) => item.type === NewsType.ANNOUNCEMENT);
  const changelog = news.filter((item) => item.type === NewsType.CHANGELOG);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Actualités</h1>
      <Tabs defaultValue="annonces">
        <TabsList>
          <TabsTrigger value="annonces">Annonces</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>
        <TabsContent value="annonces" className="pt-0">
          <NewsFeed items={announcements} />
        </TabsContent>
        <TabsContent value="changelog" className="pt-0">
          <NewsFeed items={changelog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
