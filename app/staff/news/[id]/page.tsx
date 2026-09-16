import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  if (params.id === "new") {
    return { title: "Nouvelle actualité" };
  }

  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: { title: true },
  });

  if (!news?.title) {
    return { title: "Modifier l'actualité" };
  }

  const cleanTitle = news.title.length > 50 ? `${news.title.slice(0, 47)}...` : news.title;
  return {
    title: `Modifier : ${cleanTitle}`,
  };
}
import { NewsForm } from "./news-form";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";

export default async function StaffNewsEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireRole([Role.ADMIN]);

  let initialData = null;

  if (params.id !== "new") {
    const news = await prisma.news.findUnique({
      where: { id: params.id },
    });

    if (!news) {
      notFound();
    }

    initialData = {
      id: news.id,
      title: news.title,
      type: news.type,
      excerpt: news.excerpt,
      content: news.content || "",
      authorLabel: news.authorLabel,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AtlasBackButton href="/staff/news" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {initialData ? "Modifier l'actualité" : "Nouvelle actualité"}
        </h1>
      </div>
      <NewsForm initialData={initialData} userRole={user.role} />
    </div>
  );
}
