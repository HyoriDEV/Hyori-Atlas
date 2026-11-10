"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { formatTicketCategoryName } from "@/lib/navigation";

export interface TicketCategoryConfigData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  enabled: boolean;
  allowedRoles: Role[];
  subcategories: TicketSubcategoryConfigData[];
}

export interface TicketSubcategoryConfigData {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  enabled: boolean;
  placeholderSubject: string | null;
  placeholderDescription: string | null;
}

export async function getTicketConfigData(): Promise<TicketCategoryConfigData[]> {
  const categories = await prisma.ticketCategoryConfig.findMany({
    orderBy: { order: "asc" },
    include: {
      subcategories: {
        orderBy: { order: "asc" },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: formatTicketCategoryName(cat.name),
    description: cat.description,
    icon: cat.icon,
    order: cat.order,
    enabled: cat.enabled,
    allowedRoles: cat.allowedRoles,
    subcategories: cat.subcategories.map((sub) => ({
      id: sub.id,
      categoryId: sub.categoryId,
      slug: sub.slug,
      name: sub.name,
      description: sub.description,
      order: sub.order,
      enabled: sub.enabled,
      placeholderSubject: sub.placeholderSubject,
      placeholderDescription: sub.placeholderDescription,
    })),
  }));
}

export async function getActiveTicketConfigForPlayer(): Promise<TicketCategoryConfigData[]> {
  const categories = await prisma.ticketCategoryConfig.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    include: {
      subcategories: {
        where: { enabled: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: formatTicketCategoryName(cat.name),
    description: cat.description,
    icon: cat.icon,
    order: cat.order,
    enabled: cat.enabled,
    allowedRoles: cat.allowedRoles,
    subcategories: cat.subcategories.map((sub) => ({
      id: sub.id,
      categoryId: sub.categoryId,
      slug: sub.slug,
      name: sub.name,
      description: sub.description,
      order: sub.order,
      enabled: sub.enabled,
      placeholderSubject: sub.placeholderSubject,
      placeholderDescription: sub.placeholderDescription,
    })),
  }));
}

export async function saveTicketCategoryAction(data: {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  enabled?: boolean;
  allowedRoles?: Role[];
}) {
  await requireRole([Role.ADMIN]);

  const slug = data.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const name = data.name.trim();

  if (!name) {
    return { success: false, error: "Le nom de la catégorie est requis." };
  }
  if (!slug) {
    return { success: false, error: "L'identifiant slug de la catégorie est requis." };
  }

  try {
    if (data.id) {
      await prisma.ticketCategoryConfig.update({
        where: { id: data.id },
        data: {
          slug,
          name,
          description: data.description?.trim() || null,
          icon: data.icon?.trim() || null,
          enabled: data.enabled ?? true,
          allowedRoles: data.allowedRoles ?? [],
        },
      });
    } else {
      const highestOrder = await prisma.ticketCategoryConfig.aggregate({
        _max: { order: true },
      });
      const nextOrder = (highestOrder._max.order ?? -1) + 1;

      await prisma.ticketCategoryConfig.create({
        data: {
          slug,
          name,
          description: data.description?.trim() || null,
          icon: data.icon?.trim() || null,
          enabled: data.enabled ?? true,
          allowedRoles: data.allowedRoles ?? [],
          order: nextOrder,
        },
      });
    }

    revalidatePath("/staff/settings");
    revalidatePath("/player/tickets");
    revalidatePath("/staff/tickets");
    return { success: true };
  } catch (error: unknown) {
    console.error("[saveTicketCategoryAction] Error:", error);
    const msg = error instanceof Error ? error.message : "Erreur inattendue.";
    return { success: false, error: msg };
  }
}

export async function deleteTicketCategoryAction(id: string) {
  await requireRole([Role.ADMIN]);

  try {
    const ticketCount = await prisma.ticket.count({
      where: { categoryId: id },
    });

    if (ticketCount > 0) {
      // Pour éviter de briser l'historique, on désactive au lieu de supprimer si des tickets y sont liés
      await prisma.ticketCategoryConfig.update({
        where: { id },
        data: { enabled: false },
      });
      revalidatePath("/staff/settings");
      revalidatePath("/player/tickets");
      return {
        success: true,
        message:
          "La catégorie contient des tickets existants : elle a été désactivée plutôt que supprimée pour préserver l'historique.",
      };
    }

    await prisma.ticketCategoryConfig.delete({
      where: { id },
    });

    revalidatePath("/staff/settings");
    revalidatePath("/player/tickets");
    return { success: true };
  } catch (error: unknown) {
    console.error("[deleteTicketCategoryAction] Error:", error);
    return { success: false, error: "Impossible de supprimer cette catégorie." };
  }
}

export async function saveTicketSubcategoryAction(data: {
  id?: string;
  categoryId: string;
  slug: string;
  name: string;
  description?: string | null;
  placeholderSubject?: string | null;
  placeholderDescription?: string | null;
  enabled?: boolean;
}) {
  await requireRole([Role.ADMIN]);

  const slug = data.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const name = data.name.trim();

  if (!name) {
    return { success: false, error: "Le nom de la sous-catégorie est requis." };
  }
  if (!slug) {
    return { success: false, error: "Le slug de la sous-catégorie est requis." };
  }
  if (!data.categoryId) {
    return { success: false, error: "La catégorie parente est requise." };
  }

  try {
    if (data.id) {
      await prisma.ticketSubcategoryConfig.update({
        where: { id: data.id },
        data: {
          slug,
          name,
          description: data.description?.trim() || null,
          placeholderSubject: data.placeholderSubject?.trim() || null,
          placeholderDescription: data.placeholderDescription?.trim() || null,
          enabled: data.enabled ?? true,
        },
      });
    } else {
      const highestOrder = await prisma.ticketSubcategoryConfig.aggregate({
        where: { categoryId: data.categoryId },
        _max: { order: true },
      });
      const nextOrder = (highestOrder._max.order ?? -1) + 1;

      await prisma.ticketSubcategoryConfig.create({
        data: {
          categoryId: data.categoryId,
          slug,
          name,
          description: data.description?.trim() || null,
          placeholderSubject: data.placeholderSubject?.trim() || null,
          placeholderDescription: data.placeholderDescription?.trim() || null,
          enabled: data.enabled ?? true,
          order: nextOrder,
        },
      });
    }

    revalidatePath("/staff/settings");
    revalidatePath("/player/tickets");
    revalidatePath("/staff/tickets");
    return { success: true };
  } catch (error: unknown) {
    console.error("[saveTicketSubcategoryAction] Error:", error);
    const msg = error instanceof Error ? error.message : "Erreur inattendue.";
    return { success: false, error: msg };
  }
}

export async function deleteTicketSubcategoryAction(id: string) {
  await requireRole([Role.ADMIN]);

  try {
    const ticketCount = await prisma.ticket.count({
      where: { subcategoryId: id },
    });

    if (ticketCount > 0) {
      await prisma.ticketSubcategoryConfig.update({
        where: { id },
        data: { enabled: false },
      });
      revalidatePath("/staff/settings");
      revalidatePath("/player/tickets");
      return {
        success: true,
        message:
          "Cette sous-catégorie contient des tickets : elle a été désactivée pour préserver l'historique.",
      };
    }

    await prisma.ticketSubcategoryConfig.delete({
      where: { id },
    });

    revalidatePath("/staff/settings");
    revalidatePath("/player/tickets");
    return { success: true };
  } catch (error: unknown) {
    console.error("[deleteTicketSubcategoryAction] Error:", error);
    return { success: false, error: "Impossible de supprimer cette sous-catégorie." };
  }
}
