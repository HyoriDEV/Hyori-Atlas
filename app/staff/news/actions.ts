"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NewsType, Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";

export async function createNews(formData: FormData) {
  const user = await requireRole([Role.ADMIN]);

  const title = formData.get("title") as string;
  const type = formData.get("type") as NewsType;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const authorLabel = formData.get("authorLabel") as string;

  if (!title || !type || !excerpt || !authorLabel) {
    throw new Error("Missing required fields");
  }

  await prisma.news.create({
    data: {
      title,
      type,
      excerpt,
      content,
      authorLabel,
      authorId: user.id,
    },
  });

  revalidatePath("/staff/news");
  revalidatePath("/news");
  redirect("/staff/news");
}

export async function updateNews(id: string, formData: FormData) {
  await requireRole([Role.ADMIN]);

  const title = formData.get("title") as string;
  const type = formData.get("type") as NewsType;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const authorLabel = formData.get("authorLabel") as string;

  if (!title || !type || !excerpt || !authorLabel) {
    throw new Error("Missing required fields");
  }

  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("News not found");
  }

  await prisma.news.update({
    where: { id },
    data: {
      title,
      type,
      excerpt,
      content,
      authorLabel,
    },
  });

  revalidatePath("/staff/news");
  revalidatePath("/news");
  redirect("/staff/news");
}

export async function deleteNews(id: string) {
  await requireRole([Role.ADMIN]);

  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("News not found");
  }

  await prisma.news.delete({
    where: { id },
  });

  revalidatePath("/staff/news");
  revalidatePath("/news");
}
