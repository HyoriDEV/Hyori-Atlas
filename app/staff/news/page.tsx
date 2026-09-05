import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

export default async function StaffNewsPage() {
  await requireRole([Role.ADMIN, Role.DEVELOPER]);

  const news = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Actualités</h1>
        <Button render={<Link href="/staff/news/new" className="gap-2" />}>
          <Plus className="size-4" />
          Créer une actualité
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {news.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune actualité publiée.</p>
        ) : (
          news.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.title}</span>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  render={<Link href={`/staff/news/${item.id}`} />}
                >
                  Modifier
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{item.excerpt}</p>
                <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
                  <span>{item.authorLabel}</span>
                  <span>•</span>
                  <span>
                    Publié le{" "}
                    {formatDate(item.publishedAt, {
                      style: "prefix-long",
                      withTime: false,
                      withYear: true,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
