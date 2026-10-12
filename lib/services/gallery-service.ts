import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { GalleryCategory, GalleryStatus } from "@/lib/generated/prisma/enums";

export interface GalleryFilterOptions {
  category?: GalleryCategory | "ALL";
  search?: string;
  sort?: "recent" | "likes" | "featured";
  currentUserId?: string;
}

const AUTHOR_SELECT = {
  id: true,
  discordDisplayName: true,
  discordUsername: true,
  discordAvatarUrl: true,
  minecraftUsername: true,
  minecraftUuid: true,
  minecraftAvatarUrl: true,
  minecraftSkinUpdatedAt: true,
};

export async function getApprovedGalleryItems(options: GalleryFilterOptions = {}) {
  const { category, search, sort = "recent", currentUserId } = options;

  const whereClause: Prisma.GalleryItemWhereInput = {
    status: GalleryStatus.APPROVED,
  };

  if (category && category !== "ALL") {
    whereClause.category = category;
  }

  if (search && search.trim().length > 0) {
    const q = search.trim();
    whereClause.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { author: { minecraftUsername: { contains: q, mode: "insensitive" } } },
      { author: { discordDisplayName: { contains: q, mode: "insensitive" } } },
      { author: { discordUsername: { contains: q, mode: "insensitive" } } },
    ];
  }

  let orderByClause: Prisma.GalleryItemOrderByWithRelationInput[] = [
    { isFeatured: "desc" },
    { createdAt: "desc" },
  ];

  if (sort === "recent") {
    orderByClause = [{ createdAt: "desc" }];
  } else if (sort === "featured") {
    orderByClause = [{ isFeatured: "desc" }, { createdAt: "desc" }];
  } else if (sort === "likes") {
    orderByClause = [{ likes: { _count: "desc" } }, { createdAt: "desc" }];
  }

  const items = await prisma.galleryItem.findMany({
    where: whereClause,
    orderBy: orderByClause,
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
      _count: {
        select: { likes: true },
      },
      likes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true },
          }
        : false,
      taggedUsers: {
        include: {
          user: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  return items.map((item) => ({
    ...item,
    likeCount: item._count.likes,
    isLikedByCurrentUser: currentUserId ? (item.likes?.length ?? 0) > 0 : false,
    likes: undefined,
    _count: undefined,
  }));
}

export async function getFeaturedGalleryItem(currentUserId?: string) {
  let item = await prisma.galleryItem.findFirst({
    where: {
      status: GalleryStatus.APPROVED,
      isFeatured: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
      _count: {
        select: { likes: true },
      },
      likes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true },
          }
        : false,
      taggedUsers: {
        include: {
          user: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  // Si aucune capture n'est explicitement mise en avant, on prend la plus récente avec le plus de likes
  if (!item) {
    item = await prisma.galleryItem.findFirst({
      where: {
        status: GalleryStatus.APPROVED,
      },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      include: {
        author: {
          select: AUTHOR_SELECT,
        },
        _count: {
          select: { likes: true },
        },
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
        taggedUsers: {
          include: {
            user: {
              select: AUTHOR_SELECT,
            },
          },
        },
      },
    });
  }

  if (!item) return null;

  return {
    ...item,
    likeCount: item._count.likes,
    isLikedByCurrentUser: currentUserId ? (item.likes?.length ?? 0) > 0 : false,
    likes: undefined,
    _count: undefined,
  };
}

export async function getGalleryItemById(id: string, currentUserId?: string) {
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
      reviewedBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      _count: {
        select: { likes: true },
      },
      likes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true },
          }
        : false,
      taggedUsers: {
        include: {
          user: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  if (!item) return null;

  return {
    ...item,
    likeCount: item._count.likes,
    isLikedByCurrentUser: currentUserId ? (item.likes?.length ?? 0) > 0 : false,
    likes: undefined,
    _count: undefined,
  };
}

export async function getPlayerGalleryItems(userId: string) {
  const items = await prisma.galleryItem.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
      _count: {
        select: { likes: true },
      },
      taggedUsers: {
        include: {
          user: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  return items.map((item) => ({
    ...item,
    likeCount: item._count.likes,
    _count: undefined,
  }));
}

export async function getStaffGalleryItems(status?: GalleryStatus, search?: string) {
  const whereClause: Prisma.GalleryItemWhereInput = {};

  if (status) {
    whereClause.status = status;
  }

  if (search && search.trim().length > 0) {
    const q = search.trim();
    whereClause.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { author: { minecraftUsername: { contains: q, mode: "insensitive" } } },
      { author: { discordDisplayName: { contains: q, mode: "insensitive" } } },
      { author: { discordUsername: { contains: q, mode: "insensitive" } } },
    ];
  }

  const items = await prisma.galleryItem.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
      reviewedBy: {
        select: {
          minecraftUsername: true,
          discordDisplayName: true,
        },
      },
      _count: {
        select: { likes: true },
      },
      taggedUsers: {
        include: {
          user: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  return items.map((item) => ({
    ...item,
    likeCount: item._count.likes,
    _count: undefined,
  }));
}

export async function getPendingGalleryCount(): Promise<number> {
  return await prisma.galleryItem.count({
    where: { status: GalleryStatus.PENDING },
  });
}

export async function getUserTodayUploadCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return await prisma.galleryItem.count({
    where: {
      authorId: userId,
      createdAt: { gte: startOfDay },
    },
  });
}
