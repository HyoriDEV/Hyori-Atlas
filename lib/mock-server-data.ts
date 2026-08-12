export interface MockSessionBlock {
  debut: Date;
  fin: Date;
  dureeMinutes: number;
}

export type MockSanctionType = "Ban" | "Mute" | "Kick";

export interface MockSanction {
  date: Date;
  type: MockSanctionType;
  text: string;
}

export interface MockServerActivity {
  lastLoginAt: Date | null;
  totalPlaytimeMinutes: number;
  firstServerLoginAt: Date | null;
  sessionBlocks: MockSessionBlock[];
  sanctions: MockSanction[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const MOCK_SANCTION_TEXT_POOL: Record<MockSanctionType, string[]> = {
  Ban: [
    "Ban de 3 jours pour non-respect du règlement RP",
    "Ban de 7 jours pour propos déplacés en chat",
    "Ban permanent pour triche avérée",
  ],
  Mute: [
    "Mute de 24h pour spam en chat général",
    "Mute de 3h pour propos déplacés en chat RP",
    "Mute de 12h pour hors-sujet répété",
  ],
  Kick: ["Kick pour AFK prolongé en zone RP", "Kick pour comportement perturbateur"],
};

const MOCK_SANCTION_TYPES: MockSanctionType[] = ["Ban", "Mute", "Kick"];

function hashStringToSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatPlaytime(minutes: number): string {
  return `${Math.floor(minutes / 60)}h`;
}

export function getMockServerActivity(
  userId: string,
  referenceCreatedAt: Date
): MockServerActivity {
  const rng = mulberry32(hashStringToSeed(userId));
  const now = new Date();

  const hasConnected = rng() < 0.75 && referenceCreatedAt.getTime() < now.getTime();
  if (!hasConnected) {
    return {
      lastLoginAt: null,
      totalPlaytimeMinutes: 0,
      firstServerLoginAt: null,
      sessionBlocks: [],
      sanctions: [],
    };
  }

  const maxFirstLoginOffsetMs = Math.min(
    14 * DAY_MS,
    Math.max(now.getTime() - referenceCreatedAt.getTime(), 0)
  );
  const firstServerLoginAt = new Date(referenceCreatedAt.getTime() + rng() * maxFirstLoginOffsetMs);

  const activeSpanMs = Math.max(now.getTime() - firstServerLoginAt.getTime(), 0);
  const lastLoginAt = new Date(firstServerLoginAt.getTime() + rng() * activeSpanMs);

  const activeDays = Math.max((lastLoginAt.getTime() - firstServerLoginAt.getTime()) / DAY_MS, 1);
  const totalPlaytimeMinutes = Math.round(activeDays * (30 + rng() * 150));

  const sessionCount = Math.floor(rng() * 6);
  const spanMs = Math.max(lastLoginAt.getTime() - firstServerLoginAt.getTime(), 1);
  const sessionBlocks: MockSessionBlock[] = Array.from({ length: sessionCount }, () => {
    const start = firstServerLoginAt.getTime() + rng() * spanMs;
    const dureeMinutes = Math.round(15 + rng() * 180);
    const debut = new Date(start);
    const fin = new Date(start + dureeMinutes * 60_000);
    return { debut, fin, dureeMinutes };
  }).sort((a, b) => b.debut.getTime() - a.debut.getTime());

  const sanctionCount = Math.floor(rng() * 4);
  const sanctions: MockSanction[] = Array.from({ length: sanctionCount }, () => {
    const type = MOCK_SANCTION_TYPES[Math.floor(rng() * MOCK_SANCTION_TYPES.length)];
    const pool = MOCK_SANCTION_TEXT_POOL[type];
    const text = pool[Math.floor(rng() * pool.length)];
    const date = new Date(firstServerLoginAt.getTime() + rng() * spanMs);
    return { date, type, text };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    lastLoginAt,
    totalPlaytimeMinutes,
    firstServerLoginAt,
    sessionBlocks,
    sanctions,
  };
}
