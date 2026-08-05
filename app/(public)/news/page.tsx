import { prisma } from "@/lib/prisma";
import { NewsType } from "@/lib/generated/prisma/enums";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function NewsFeed({ items }: { items: Awaited<ReturnType<typeof getNews>> }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune publication pour le moment.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">{formatDate(item.publishedAt)}</span>
              <Badge variant="secondary">{item.authorLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
            <p className="text-muted-foreground text-base">{item.excerpt}</p>
          </CardContent>
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
