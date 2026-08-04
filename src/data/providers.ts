import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  positions,
  type Champion,
  type ChampionDataProvider,
  type ChampionStats,
  type ChampionStatsProvider,
  type MatchupStats,
  type Position,
  type StatsProviderMetadata,
} from '../domain.js';

const rate = z.number().min(0).max(1);
const rawStatsSchema = z.object({
  championId: z.string().min(1),
  position: z.enum(positions),
  winRate: rate,
  pickRate: rate,
  banRate: rate.optional(),
  games: z.number().nonnegative(),
  patch: z.string().min(1),
  tierRange: z.string().min(1).optional(),
  tier: z.string().min(1).optional(),
  region: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  isDemo: z.boolean().optional(),
  isSample: z.boolean().optional(),
  reason: z.string().default(''),
});
const rawMatchupSchema = z.object({
  championId: z.string(),
  opponentId: z.string(),
  position: z.enum(positions),
  championWinRate: rate.optional(),
  winRate: rate.optional(),
  opponentPickRate: rate,
  opponentBanRate: rate.optional(),
  games: z.number().nonnegative(),
  patch: z.string(),
  tierRange: z.string().optional(),
  tier: z.string().optional(),
  region: z.string().optional(),
  source: z.string().optional(),
  updatedAt: z.string().optional(),
  isDemo: z.boolean().optional(),
});
async function json<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(`./${name}`, import.meta.url), 'utf8')) as T;
}

function optional<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}
export function parseChampionStats(value: unknown): ChampionStats {
  const stat = rawStatsSchema.parse(value);
  return {
    championId: stat.championId,
    position: stat.position,
    winRate: stat.winRate,
    pickRate: stat.pickRate,
    banRate: optional(stat.banRate, 0),
    games: stat.games,
    patch: stat.patch,
    tierRange: stat.tierRange ?? stat.tier ?? '미상',
    region: stat.region,
    updatedAt: optional(stat.updatedAt, '로컬 샘플'),
    source: optional(stat.source, '로컬 샘플 데이터'),
    isDemo: stat.isDemo ?? stat.isSample ?? true,
    reason: stat.reason,
  };
}

function parseMatchup(value: unknown): MatchupStats {
  const matchup = rawMatchupSchema.parse(value);
  return {
    championId: matchup.championId,
    opponentId: matchup.opponentId,
    position: matchup.position,
    championWinRate: matchup.championWinRate ?? matchup.winRate!,
    opponentPickRate: matchup.opponentPickRate,
    opponentBanRate: matchup.opponentBanRate,
    games: matchup.games,
    patch: matchup.patch,
    tierRange: matchup.tierRange ?? matchup.tier ?? '미상',
    region: optional(matchup.region, '미상'),
    source: optional(matchup.source, '로컬 샘플 데이터'),
    updatedAt: optional(matchup.updatedAt, '로컬 샘플'),
    isDemo: optional(matchup.isDemo, true),
  };
}

export class JsonChampionDataProvider implements ChampionDataProvider {
  private readonly champions = json<Champion[]>('champions.json');

  async getChampions(): Promise<Champion[]> {
    return this.champions;
  }
  async getChampionById(id: string): Promise<Champion | null> {
    return (await this.getChampions()).find((champion) => champion.id === id) ?? null;
  }
}
export class JsonChampionStatsProvider implements ChampionStatsProvider {
  private readonly stats = json<unknown[]>('stats.json').then((values) =>
    values.map(parseChampionStats),
  );
  private readonly matchups = json<unknown[]>('matchups.json').then((values) =>
    values.map(parseMatchup),
  );

  async getStats(position: Position): Promise<ChampionStats[]> {
    return (await this.stats).filter((stat) => stat.position === position);
  }
  async getMatchups(championId: string, position: Position): Promise<MatchupStats[]> {
    return (await this.matchups).filter(
      (matchup) => matchup.championId === championId && matchup.position === position,
    );
  }
  async getMetadata(): Promise<StatsProviderMetadata> {
    return {
      providerName: '로컬 샘플 데이터',
      sourceUrl: 'src/data/stats.json',
      isDemo: true,
      fetchedAt: '로컬 샘플',
    };
  }
}
