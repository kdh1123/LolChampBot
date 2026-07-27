import { describe, expect, it } from 'vitest';
import { parseChampionStats } from './providers.js';

const valid = {
  championId: 'annie',
  position: '미드',
  winRate: 0.52,
  pickRate: 0.04,
  banRate: 0.01,
  games: 100,
  patch: '15.1',
  tierRange: '에메랄드+',
  region: 'KR',
  updatedAt: '2026-07-27',
  source: 'test',
  isDemo: true,
  reason: '',
};
describe('JSON statistics schema', () => {
  it('validates rates, games, source, and demo flag', () => {
    expect(parseChampionStats(valid)).toMatchObject({
      banRate: 0.01,
      source: 'test',
      isDemo: true,
    });
    expect(() => parseChampionStats({ ...valid, winRate: 1.01 })).toThrow();
    expect(() => parseChampionStats({ ...valid, pickRate: -0.01 })).toThrow();
    expect(() => parseChampionStats({ ...valid, banRate: 2 })).toThrow();
    expect(() => parseChampionStats({ ...valid, games: -1 })).toThrow();
    expect(() => parseChampionStats({ ...valid, source: '' })).toThrow();
  });
  it('migrates the legacy sample shape explicitly as demo data', () => {
    const { banRate, tierRange, source, isDemo } = parseChampionStats({
      ...valid,
      banRate: undefined,
      tierRange: undefined,
      tier: 'all',
      source: undefined,
      isDemo: undefined,
      isSample: true,
    });
    expect(banRate).toBe(0);
    expect(tierRange).toBe('all');
    expect(source).toBe('로컬 샘플 데이터');
    expect(isDemo).toBe(true);
  });
});
