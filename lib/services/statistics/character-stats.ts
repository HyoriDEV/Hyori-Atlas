import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  CharacterStatus,
  Gender,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { SKILL_DEFINITIONS } from "@/lib/character-sheet";
import { characterStatusLabels } from "@/lib/navigation";
import { getPlayerAffiliationOverview } from "@/lib/services/player-affiliation-overview-service";
import { countWords, mean } from "@/lib/text-stats";
import {
  countByBucket,
  createTimeline,
  earliestDate,
  resolveTimelineStart,
  type Granularity,
  type LabelledCount,
  type StatisticsRange,
} from "@/lib/services/statistics/timeline";

const TOP_AUTHORS_COUNT = 10;

const AGE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "16 – 25 ans", min: 16, max: 25 },
  { label: "26 – 35 ans", min: 26, max: 35 },
  { label: "36 – 45 ans", min: 36, max: 45 },
  { label: "46 – 55 ans", min: 46, max: 55 },
  { label: "56 ans et plus", min: 56, max: Number.POSITIVE_INFINITY },
];

const SKILL_CATEGORIES: { prefix: string; label: string }[] = [
  { prefix: "physical", label: "Physique" },
  { prefix: "mental", label: "Mental" },
  { prefix: "social", label: "Social" },
];

const CHARACTER_STATUS_ORDER: CharacterStatus[] = [
  CharacterStatus.ACTIVE,
  CharacterStatus.DEAD,
  CharacterStatus.DISABLED,
];

export interface TopAuthor {
  playerId: string;
  name: string;
  minecraftUsername: string | null;
  words: number;
  chapters: number;
}

export interface CharacterStats {
  byStatus: LabelledCount[];
  /** Personnages actifs dont la fiche est validée : la base des répartitions ci-dessous. */
  activeCharacters: number;
  classes: { name: string; count: number; roles: LabelledCount[] }[];
  affiliatedPlayers: number;
  gender: LabelledCount[];
  ageBands: LabelledCount[];
  meanAge: number | null;
  skills: { category: string; skills: { label: string; average: number }[] }[];
  writing: {
    whitelisted: number;
    authors: number;
    totalWords: number;
    totalChapters: number;
    meanWordsPerAuthor: number | null;
    granularity: Granularity;
    timeline: { label: string; chapters: number }[];
    chaptersInPeriod: number;
    topAuthors: TopAuthor[];
  };
}

export async function getCharacterStats(range: StatisticsRange): Promise<CharacterStats> {
  const [statusCounts, activeSheets, affiliation, chapters, whitelistedCount] = await Promise.all([
    prisma.characterSheet.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.characterSheet.findMany({
      where: { status: CharacterStatus.ACTIVE, reviewStatus: CharacterSheetStatus.VALIDATED },
      select: {
        age: true,
        gender: true,
        physicalForce: true,
        physicalEndurance: true,
        physicalStealth: true,
        physicalDexterity: true,
        mentalIntelligence: true,
        mentalComposure: true,
        mentalWeaponsMastery: true,
        socialCharisma: true,
        socialPersuasion: true,
        socialViolence: true,
      },
    }),
    getPlayerAffiliationOverview(),
    prisma.chapter.findMany({
      select: {
        playerId: true,
        content: true,
        createdAt: true,
        player: {
          select: {
            minecraftUsername: true,
            discordDisplayName: true,
            registrationStatus: true,
          },
        },
      },
    }),
    prisma.user.count({ where: { registrationStatus: RegistrationStatus.WHITELISTED } }),
  ]);

  const ages = activeSheets.map((sheet) => sheet.age);

  const skills = SKILL_CATEGORIES.map((category) => ({
    category: category.label,
    skills: SKILL_DEFINITIONS.filter((skill) => skill.field.startsWith(category.prefix)).map(
      (skill) => ({
        label: skill.label,
        average:
          activeSheets.length > 0
            ? activeSheets.reduce((sum, sheet) => sum + sheet[skill.field], 0) / activeSheets.length
            : 0,
      })
    ),
  }));

  const authors = new Map<string, TopAuthor & { whitelisted: boolean }>();
  let totalWords = 0;
  for (const chapter of chapters) {
    const words = countWords(chapter.content);
    totalWords += words;
    const author = authors.get(chapter.playerId) ?? {
      playerId: chapter.playerId,
      name: chapter.player.minecraftUsername ?? chapter.player.discordDisplayName,
      minecraftUsername: chapter.player.minecraftUsername,
      words: 0,
      chapters: 0,
      whitelisted: chapter.player.registrationStatus === RegistrationStatus.WHITELISTED,
    };
    author.words += words;
    author.chapters += 1;
    authors.set(chapter.playerId, author);
  }
  // Un chapitre créé mais laissé vide ne fait pas de son joueur un auteur.
  const writingAuthors = [...authors.values()].filter((author) => author.words > 0);

  const chapterDates = chapters.map((chapter) => chapter.createdAt);
  const timeline = createTimeline(
    resolveTimelineStart(range, earliestDate(chapterDates)),
    range.now
  );
  const chaptersByBucket = countByBucket(timeline, chapterDates);

  return {
    byStatus: CHARACTER_STATUS_ORDER.map((status) => ({
      label: characterStatusLabels[status],
      value: statusCounts.find((entry) => entry.status === status)?._count._all ?? 0,
    })),
    activeCharacters: activeSheets.length,
    classes: affiliation.classes.map((playerClass) => ({
      name: playerClass.name,
      count: playerClass.count,
      roles: playerClass.roles.map((role) => ({ label: role.name, value: role.count })),
    })),
    affiliatedPlayers: affiliation.totalPlayers,
    gender: Object.values(Gender).map((gender) => ({
      label: gender,
      value: activeSheets.filter((sheet) => sheet.gender === gender).length,
    })),
    ageBands: AGE_BANDS.map((band) => ({
      label: band.label,
      value: ages.filter((age) => age >= band.min && age <= band.max).length,
    })),
    meanAge: mean(ages),
    skills,
    writing: {
      whitelisted: whitelistedCount,
      authors: writingAuthors.filter((author) => author.whitelisted).length,
      totalWords,
      totalChapters: chapters.length,
      meanWordsPerAuthor: mean(writingAuthors.map((author) => author.words)),
      granularity: timeline.granularity,
      timeline: timeline.buckets.map((bucket, index) => ({
        label: bucket.label,
        chapters: chaptersByBucket[index],
      })),
      chaptersInPeriod: chaptersByBucket.reduce((sum, value) => sum + value, 0),
      topAuthors: writingAuthors
        .sort((a, b) => b.words - a.words)
        .slice(0, TOP_AUTHORS_COUNT)
        .map((author) => ({
          playerId: author.playerId,
          name: author.name,
          minecraftUsername: author.minecraftUsername,
          words: author.words,
          chapters: author.chapters,
        })),
    },
  };
}
