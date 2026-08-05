import { describe, expect, it } from 'vitest';
import { difficulties, positions } from '../domain.js';
import { difficultyFor } from '../services/recommendation.js';
import { JsonChampionDataProvider, JsonChampionStatsProvider } from './providers.js';

describe('bundled demo data', () => {
  it('keeps every position and difficulty available with valid champion references', async () => {
    const champions = await new JsonChampionDataProvider().getChampions();
    const statsProvider = new JsonChampionStatsProvider();
    const championsById = new Map(champions.map((champion) => [champion.id, champion]));

    await Promise.all(
      positions.map(async (position) => {
        const stats = await statsProvider.getStats(position);
        expect(stats).toHaveLength(20);

        for (const stat of stats) {
          const champion = championsById.get(stat.championId);
          expect(champion, `${stat.championId} must exist`).toBeDefined();
          expect(champion?.positions).toContain(position);
        }

        for (const difficulty of difficulties) {
          expect(
            stats.filter((stat) => {
              const champion = championsById.get(stat.championId)!;
              return difficultyFor(champion.difficultyFactors) === difficulty;
            }),
            `${position} · ${difficulty} must have a recommendation candidate`,
          ).not.toHaveLength(0);
        }
      }),
    );
  });
});
