export interface MockSessionBlock {
  debut: Date;
  fin: Date;
  dureeMinutes: number;
}

export type MockSanctionType = "Ban" | "Mute" | "Kick";

export interface MockSanction {
  date: Date;
  type: MockSanctionType;
  title: string;
  reason: string;
}

export interface MockServerActivity {
  lastLoginAt: Date | null;
  totalPlaytimeMinutes: number;
  firstServerLoginAt: Date | null;
  sessionBlocks: MockSessionBlock[];
  sanctions: MockSanction[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const MOCK_SANCTION_POOL: Record<MockSanctionType, Array<{ title: string; reason: string }>> = {
  Ban: [
    { title: "Bannissement de 3 jours", reason: "Non-respect du règlement RP" },
    { title: "Bannissement de 7 jours", reason: "Propos déplacés en chat" },
    { title: "Bannissement de 7 jours", reason: "Comportement perturbateur" },
    { title: "Bannissement permanent", reason: "Triche avérée" },
  ],
  Mute: [
    { title: "Mute de 24h", reason: "Spam en chat général" },
    { title: "Mute de 3h", reason: "Propos déplacés en chat RP" },
    { title: "Mute de 12h", reason: "Hors-sujet répété" },
  ],
  Kick: [
    { title: "Expulsion du serveur", reason: "AFK prolongé en zone RP" },
    { title: "Expulsion du serveur", reason: "Comportement perturbateur" },
  ],
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
    const pool = MOCK_SANCTION_POOL[type];
    const item = pool[Math.floor(rng() * pool.length)];
    const date = new Date(firstServerLoginAt.getTime() + rng() * spanMs);
    return { date, type, title: item.title, reason: item.reason };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    lastLoginAt,
    totalPlaytimeMinutes,
    firstServerLoginAt,
    sessionBlocks,
    sanctions,
  };
}
