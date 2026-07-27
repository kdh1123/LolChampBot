import { describe, expect, it } from 'vitest';
import {
  difficultyFor,
  difficultyScore,
  RecommendationService,
  seededRng,
} from './recommendation.js';
import type {
  Champion,
  ChampionDataProvider,
  ChampionStats,
  ChampionStatsProvider,
  MatchupStats,
  Position,
} from '../domain.js';
const champions: Champion[] = [
  {
    id: 'easy',
    name: '쉬움',
    imageUrl: '',
    positions: ['미드'],
    difficultyFactors: {
      skillShot: 1,
      mechanics: 1,
      laning: 1,
      survival: 2,
      scaling: 2,
      decisionMaking: 2,
    },
  },
  {
    id: 'mid',
    name: '보통',
    imageUrl: '',
    positions: ['미드'],
    difficultyFactors: {
      skillShot: 2,
      mechanics: 2,
      laning: 2,
      survival: 2,
      scaling: 2,
      decisionMaking: 2,
    },
  },
  {
    id: 'hard',
    name: '어려움',
    imageUrl: '',
    positions: ['미드'],
    difficultyFactors: {
      skillShot: 3,
      mechanics: 3,
      laning: 3,
      survival: 3,
      scaling: 3,
      decisionMaking: 3,
    },
  },
];
const makeStats = (ids: string[]): ChampionStats[] =>
  ids.map((id, index) => ({
    championId: id,
    position: '미드',
    winRate: 0.5 + index / 100,
    pickRate: 0.03 + index / 100,
    banRate: 0.01,
    games: index === 0 ? 100 : 10000,
    patch: 'demo',
    tierRange: 'all',
    region: 'KR',
    updatedAt: 'now',
    source: 'test',
    isDemo: true,
    reason: '',
  }));
const matchups: MatchupStats[] = [
  {
    championId: 'easy',
    opponentId: 'hard',
    position: '미드',
    championWinRate: 0.45,
    opponentPickRate: 0.1,
    games: 5000,
    patch: 'demo',
    tierRange: 'all',
    region: 'KR',
    source: 'test',
    updatedAt: 'now',
    isDemo: true,
  },
  {
    championId: 'easy',
    opponentId: 'mid',
    position: '미드',
    championWinRate: 0.47,
    opponentPickRate: 0.08,
    games: 4000,
    patch: 'demo',
    tierRange: 'all',
    region: 'KR',
    source: 'test',
    updatedAt: 'now',
    isDemo: true,
  },
];
const data: ChampionDataProvider = {
  getChampions: async () => champions,
  getChampionById: async (id) => champions.find((item) => item.id === id) ?? null,
};
const providerFor = (stats: ChampionStats[], fail = false): ChampionStatsProvider => ({
  getStats: async (position: Position) => {
    if (fail) throw new Error('unavailable');
    return stats.filter((item) => item.position === position);
  },
  getMatchups: async () => matchups,
  getMetadata: async () => ({ providerName: 'test', isDemo: true }),
});
describe('recommendation', () => {
  it('calculates difficulty boundaries', () => {
    expect(difficultyScore(champions[0].difficultyFactors)).toBeCloseTo(1.5);
    expect(difficultyFor(champions[0].difficultyFactors)).toBe('쉬움');
    expect(difficultyFor(champions[1].difficultyFactors)).toBe('보통');
    expect(difficultyFor(champions[2].difficultyFactors)).toBe('어려움');
  });
  it('filters candidates and is reproducible', async () => {
    const stats = makeStats(champions.map((item) => item.id));
    const one = new RecommendationService(data, providerFor(stats), seededRng(7));
    const two = new RecommendationService(data, providerFor(stats), seededRng(7));
    expect((await one.recommend('미드', '쉬움', 4)).map((item) => item.champion.id)).toEqual([
      'easy',
    ]);
    expect((await one.recommend('미드', '보통', 4)).map((item) => item.champion.id)).toEqual(
      (await two.recommend('미드', '보통', 4)).map((item) => item.champion.id),
    );
  });
  it('returns an explicit no_candidates result and dynamic coverage', async () => {
    const service = new RecommendationService(data, providerFor(makeStats(['easy', 'mid'])));
    await expect(service.recommendResult('서포터', '쉬움')).resolves.toMatchObject({
      status: 'no_candidates',
      availableDifficulties: [],
    });
    await expect(service.recommendResult('미드', '어려움')).resolves.toMatchObject({
      status: 'no_candidates',
      availableDifficulties: ['쉬움', '보통'],
    });
    expect(await service.coverage()).toContainEqual({
      position: '미드',
      difficulty: '쉬움',
      count: 1,
    });
  });
  it('returns 1 through 4 available recommendations without padding', async () => {
    for (let count = 1; count <= 4; count++) {
      const available = Array.from({ length: count }, (_, index) => ({
        ...champions[0],
        id: `easy-${index}`,
      }));
      const service = new RecommendationService(
        { getChampions: async () => available, getChampionById: async () => null },
        providerFor(makeStats(available.map((item) => item.id))),
        seededRng(2),
      );
      expect(await service.recommend('미드', '쉬움', 4)).toHaveLength(count);
    }
    const expanded = Array.from({ length: 6 }, (_, index) => ({
      ...champions[0],
      id: `easy-${index}`,
    }));
    const service = new RecommendationService(
      { getChampions: async () => expanded, getChampionById: async () => null },
      providerFor(makeStats(expanded.map((item) => item.id))),
      seededRng(2),
    );
    expect(await service.recommend('미드', '쉬움', 4)).toHaveLength(4);
  });
  it('returns stats_unavailable instead of throwing', async () => {
    await expect(
      new RecommendationService(data, providerFor([], true)).recommendResult('미드', '쉬움'),
    ).resolves.toMatchObject({ status: 'stats_unavailable' });
  });
  it('returns unique same-position ban candidates ordered by disadvantage', async () => {
    const result = await new RecommendationService(
      data,
      providerFor(makeStats(champions.map((item) => item.id))),
    ).banRecommendations('easy', '미드');
    expect(result).toHaveLength(2);
    expect(new Set(result.map((item) => item.champion.id)).size).toBe(2);
    expect(result[0].champion.id).toBe('hard');
  });
});
