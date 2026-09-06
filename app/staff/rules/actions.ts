"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";

export async function createRuleSection(title: string, isPreface: boolean = false) {
  await requireRole([Role.ADMIN]);

  if (isPreface) {
    const existingPreface = await prisma.ruleSection.findFirst({
      where: { isPreface: true },
    });
    if (existingPreface) {
      throw new Error("Une préface existe déjà.");
    }

    await prisma.ruleSection.create({
      data: { title, order: 0, isPreface: true },
    });
  } else {
    const lastSection = await prisma.ruleSection.findFirst({
      orderBy: { order: "desc" },
    });

    const order = lastSection ? Math.max(lastSection.order + 1, 1) : 1;

    await prisma.ruleSection.create({
      data: { title, order, isPreface: false },
    });
  }

  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function updateRuleSection(id: string, title: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleSection.update({
    where: { id },
    data: { title },
  });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function deleteRuleSection(id: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleSection.delete({ where: { id } });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function createRuleArticle(sectionId: string, title: string) {
  await requireRole([Role.ADMIN]);

  const lastArticle = await prisma.ruleArticle.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
  });

  const order = lastArticle ? lastArticle.order + 1 : 1;

  await prisma.ruleArticle.create({
    data: { sectionId, title, order },
  });

  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function updateRuleArticle(id: string, title: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleArticle.update({
    where: { id },
    data: { title },
  });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function deleteRuleArticle(id: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleArticle.delete({ where: { id } });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function createRuleItem(articleId: string, content: string) {
  await requireRole([Role.ADMIN]);

  const lastItem = await prisma.ruleItem.findFirst({
    where: { articleId },
    orderBy: { order: "desc" },
  });

  const order = lastItem ? lastItem.order + 1 : 1;

  await prisma.ruleItem.create({
    data: { articleId, content, order },
  });

  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function updateRuleItem(id: string, content: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleItem.update({
    where: { id },
    data: { content },
  });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function deleteRuleItem(id: string) {
  await requireRole([Role.ADMIN]);
  await prisma.ruleItem.delete({ where: { id } });
  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}

export async function reorderItems(
  type: "section" | "article" | "item",
  updates: { id: string; order: number }[]
) {
  await requireRole([Role.ADMIN]);

  const operations = updates.map((update) => {
    switch (type) {
      case "section":
        return prisma.ruleSection.update({
          where: { id: update.id },
          data: { order: update.order },
        });
      case "article":
        return prisma.ruleArticle.update({
          where: { id: update.id },
          data: { order: update.order },
        });
      case "item":
        return prisma.ruleItem.update({
          where: { id: update.id },
          data: { order: update.order },
        });
    }
  });

  await prisma.$transaction(operations);

  revalidatePath("/staff/rules");
  revalidatePath("/rules");
}
