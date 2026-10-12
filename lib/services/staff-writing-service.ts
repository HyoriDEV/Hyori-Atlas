import "server-only";

import { prisma } from "@/lib/prisma";
import { ConversationType, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { countWords } from "@/lib/text-stats";

export interface StaffWritingStats {
  totalChapters: number;
  totalWords: number;
  totalAuthors: number;
  activeAuthors: number;
  avgWordsPerChapter: number;
}

export interface StaffWritingStory {
  playerId: string;
  playerName: string;
  minecraftUsername: string | null;
  discordDisplayName: string;
  discordAvatarUrl: string | null;
  characterId: string;
  characterName: string;
  characterClassName: string | null;
  chapterCount: number;
  wordCount: number;
  lastChapterTitle: string | null;
  lastUpdatedAt: Date | null;
  hasRpTracking: boolean;
}

export interface StaffWritingStoriesResult {
  stories: StaffWritingStory[];
  totalCount: number;
  totalPages: number;
}

export type StaffWritingSort = "updatedAt" | "words" | "chapters" | "player";

/**
 * Récupère les statistiques globales d'écriture du serveur (chapitres, mots, auteurs).
 */
export async function getStaffWritingStats(): Promise<StaffWritingStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [chapters, activeAuthors] = await Promise.all([
    prisma.chapter.findMany({
      where: {
        player: {
          registrationStatus: RegistrationStatus.WHITELISTED,
        },
      },
      select: {
        playerId: true,
        content: true,
        updatedAt: true,
      },
    }),
    prisma.chapter.findMany({
      where: {
        updatedAt: { gte: thirtyDaysAgo },
        player: {
          registrationStatus: RegistrationStatus.WHITELISTED,
        },
      },
      distinct: ["playerId"],
      select: { playerId: true },
    }),
  ]);

  const totalChapters = chapters.length;
  let totalWords = 0;
  const uniqueAuthors = new Set<string>();

  for (const chapter of chapters) {
    totalWords += countWords(chapter.content);
    if (chapter.playerId) {
      uniqueAuthors.add(chapter.playerId);
    }
  }

  const totalAuthors = uniqueAuthors.size;
  const avgWordsPerChapter = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

  return {
    totalChapters,
    totalWords,
    totalAuthors,
    activeAuthors: activeAuthors.length,
    avgWordsPerChapter,
  };
}

/**
 * Récupère la liste des récits/personnages ayant au moins un chapitre rédigé.
 */
export async function getStaffWritingStories(options: {
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: StaffWritingSort;
}): Promise<StaffWritingStoriesResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 10);
  const query = options.query?.trim().toLocaleLowerCase("fr") ?? "";
  const sort = options.sort ?? "updatedAt";

  // Récupérer toutes les fiches de personnages avec leurs chapitres pour les joueurs whitelistés
  const characterSheets = await prisma.characterSheet.findMany({
    where: {
      player: {
        registrationStatus: RegistrationStatus.WHITELISTED,
      },
      chapters: {
        some: {}, // Au moins un chapitre
      },
    },
    select: {
      id: true,
      name: true,
      overrideClassId: true,
      overrideClass: { select: { name: true } },
      primaryClass: { select: { name: true } },
      player: {
        select: {
          id: true,
          minecraftUsername: true,
          discordDisplayName: true,
          discordUsername: true,
          discordAvatarUrl: true,
          conversationMemberships: {
            where: { conversation: { type: ConversationType.RP_TRACKING } },
            take: 1,
            select: { conversationId: true },
          },
        },
      },
      chapters: {
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const stories: StaffWritingStory[] = characterSheets.map((sheet) => {
    const player = sheet.player;
    const playerName = player.minecraftUsername ?? player.discordDisplayName;
    let wordCount = 0;
    let lastUpdatedAt: Date | null = null;
    let lastChapterTitle: string | null = null;

    for (const chapter of sheet.chapters) {
      wordCount += countWords(chapter.content);
      if (!lastUpdatedAt || chapter.updatedAt > lastUpdatedAt) {
        lastUpdatedAt = chapter.updatedAt;
        lastChapterTitle = chapter.title;
      }
    }

    const className =
      (sheet.overrideClassId ? sheet.overrideClass?.name : sheet.primaryClass?.name) ?? null;

    return {
      playerId: player.id,
      playerName,
      minecraftUsername: player.minecraftUsername,
      discordDisplayName: player.discordDisplayName,
      discordAvatarUrl: player.discordAvatarUrl,
      characterId: sheet.id,
      characterName: sheet.name || "Nouveau personnage",
      characterClassName: className,
      chapterCount: sheet.chapters.length,
      wordCount,
      lastChapterTitle: lastChapterTitle || "Sans titre",
      lastUpdatedAt,
      hasRpTracking: player.conversationMemberships.length > 0,
    };
  });

  // Filtrage par recherche textuelle (joueur, personnage, titre de chapitre)
  const filtered = query
    ? stories.filter((story) => {
        return (
          story.playerName.toLocaleLowerCase("fr").includes(query) ||
          story.characterName.toLocaleLowerCase("fr").includes(query) ||
          (story.lastChapterTitle && story.lastChapterTitle.toLocaleLowerCase("fr").includes(query)) ||
          (story.characterClassName &&
            story.characterClassName.toLocaleLowerCase("fr").includes(query))
        );
      })
    : stories;

  // Tri
  filtered.sort((a, b) => {
    if (sort === "words") {
      return b.wordCount - a.wordCount;
    }
    if (sort === "chapters") {
      return b.chapterCount - a.chapterCount;
    }
    if (sort === "player") {
      return a.playerName.localeCompare(b.playerName, "fr", { sensitivity: "base" });
    }
    // Par défaut : dernière mise à jour
    const timeA = a.lastUpdatedAt?.getTime() ?? 0;
    const timeB = b.lastUpdatedAt?.getTime() ?? 0;
    return timeB - timeA;
  });

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedStories = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    stories: pagedStories,
    totalCount,
    totalPages,
  };
}
