"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NewsType, Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";

export async function createNews(formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.DEVELOPER]);

  const title = formData.get("title") as string;
  const type = formData.get("type") as NewsType;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const authorLabel = formData.get("authorLabel") as string;

  if (!title || !type || !excerpt || !authorLabel) {
    throw new Error("Missing required fields");
  }

  // Developer can only post CHANGELOG
  if (user.role === Role.DEVELOPER && type !== NewsType.CHANGELOG) {
    throw new Error("Developers can only post changelogs.");
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
  const user = await requireRole([Role.ADMIN, Role.DEVELOPER]);

  const title = formData.get("title") as string;
  const type = formData.get("type") as NewsType;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const authorLabel = formData.get("authorLabel") as string;

  if (!title || !type || !excerpt || !authorLabel) {
    throw new Error("Missing required fields");
  }

  // Developer can only post CHANGELOG
  if (user.role === Role.DEVELOPER && type !== NewsType.CHANGELOG) {
    throw new Error("Developers can only edit changelogs.");
  }

  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("News not found");
  }

  if (user.role === Role.DEVELOPER && existing.type !== NewsType.CHANGELOG) {
    throw new Error("Developers cannot edit announcements.");
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
  const user = await requireRole([Role.ADMIN, Role.DEVELOPER]);

  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("News not found");
  }

  if (user.role === Role.DEVELOPER && existing.type !== NewsType.CHANGELOG) {
    throw new Error("Developers cannot delete announcements.");
  }

  await prisma.news.delete({
    where: { id },
  });

  revalidatePath("/staff/news");
  revalidatePath("/news");
}
