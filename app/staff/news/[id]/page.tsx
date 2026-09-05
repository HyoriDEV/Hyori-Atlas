import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { NewsForm } from "./news-form";

export default async function StaffNewsEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireRole([Role.ADMIN, Role.DEVELOPER]);

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
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {initialData ? "Modifier l'actualité" : "Nouvelle actualité"}
      </h1>
      <NewsForm initialData={initialData} userRole={user.role} />
    </div>
  );
}
