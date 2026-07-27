import type {
  Champion,
  ChampionDataProvider,
  ChampionStats,
  ChampionStatsProvider,
  Difficulty,
  DifficultyFactors,
  MatchupStats,
  Position,
} from '../domain.js';
import { difficulties, positions } from '../domain.js';
import { difficultyConfig } from '../config.js';
export type Rng = () => number;
export function difficultyScore(factors: DifficultyFactors): number {
  const entries = Object.entries(factors) as [keyof DifficultyFactors, number][];
  const total = entries.reduce(
    (sum, [key, value]) => sum + value * difficultyConfig.weights[key],
    0,
  );
  return total / entries.reduce((sum, [key]) => sum + difficultyConfig.weights[key], 0);
}
export function difficultyFor(factors: DifficultyFactors): Difficulty {
  const score = difficultyScore(factors);
  return score < difficultyConfig.boundaries.easyMax
    ? '쉬움'
    : score < difficultyConfig.boundaries.mediumMax
      ? '보통'
      : '어려움';
}
function normalize(value: number, min: number, max: number): number {
  return max === min ? 1 : (value - min) / (max - min);
}
function range(values: number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}
export function seededRng(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export interface Recommendation {
  champion: Champion;
  stats: ChampionStats;
  score: number;
}
export interface BanRecommendation {
  champion: Champion;
  matchup: MatchupStats;
  score: number;
}
export interface Coverage {
  position: Position;
  difficulty: Difficulty;
  count: number;
}
export type RecommendationResult =
  | { status: 'success'; recommendations: Recommendation[] }
  | {
      status: 'no_candidates';
      position: Position;
      difficulty: Difficulty;
      availableDifficulties: Difficulty[];
    }
  | {
      status: 'stats_unavailable';
      position: Position;
      difficulty: Difficulty;
      availableDifficulties: Difficulty[];
    };

type Candidate = { champion: Champion; stats: ChampionStats };

export class RecommendationService {
  constructor(
    private readonly champions: ChampionDataProvider,
    private readonly stats: ChampionStatsProvider,
    private readonly rng: Rng = Math.random,
  ) {}
  async coverage(): Promise<Coverage[]> {
    const [all, byPosition] = await Promise.all([
      this.champions.getChampions(),
      Promise.all(
        positions.map(async (position) => [position, await this.safeStats(position)] as const),
      ),
    ]);
    const championsById = new Map(all.map((champion) => [champion.id, champion]));
    return byPosition.flatMap(([position, stats]) =>
      difficulties.map((difficulty) => ({
        position,
        difficulty,
        count: this.candidates(championsById, stats, position, difficulty).length,
      })),
    );
  }
  async recommendResult(
    position: Position,
    difficulty: Difficulty,
    limit = 4,
  ): Promise<RecommendationResult> {
    let stats: ChampionStats[];
    try {
      stats = await this.stats.getStats(position);
    } catch {
      return { status: 'stats_unavailable', position, difficulty, availableDifficulties: [] };
    }
    const championsById = new Map(
      (await this.champions.getChampions()).map((champion) => [champion.id, champion]),
    );
    const candidates = this.candidates(championsById, stats, position, difficulty);
    const availableDifficulties = difficulties.filter(
      (value) => this.candidates(championsById, stats, position, value).length > 0,
    );
    if (!candidates.length)
      return { status: 'no_candidates', position, difficulty, availableDifficulties };
    return {
      status: 'success',
      recommendations: this.weightedPick(this.scoreCandidates(candidates).slice(0, 8), limit),
    };
  }
  async recommend(
    position: Position,
    difficulty: Difficulty,
    limit = 4,
  ): Promise<Recommendation[]> {
    const result = await this.recommendResult(position, difficulty, limit);
    return result.status === 'success' ? result.recommendations : [];
  }
  private async safeStats(position: Position): Promise<ChampionStats[]> {
    try {
      return await this.stats.getStats(position);
    } catch {
      return [];
    }
  }
  private candidates(
    championsById: Map<string, Champion>,
    stats: ChampionStats[],
    position: Position,
    difficulty: Difficulty,
  ): Candidate[] {
    return stats.flatMap((stat) => {
      const champion = championsById.get(stat.championId);
      return champion &&
        difficultyFor(champion.difficultyFactors) === difficulty &&
        champion.positions.includes(position)
        ? [{ champion, stats: stat }]
        : [];
    });
  }
  private scoreCandidates(candidates: Candidate[]): Recommendation[] {
    const winRange = range(candidates.map((item) => item.stats.winRate));
    const pickRange = range(candidates.map((item) => item.stats.pickRate));
    const gameRange = range(candidates.map((item) => Math.log1p(item.stats.games)));
    return candidates
      .map((item) => ({
        ...item,
        score:
          normalize(item.stats.winRate, ...winRange) * 0.55 +
          normalize(item.stats.pickRate, ...pickRange) * 0.25 +
          normalize(Math.log1p(item.stats.games), ...gameRange) * 0.2,
      }))
      .sort((a, b) => b.score - a.score);
  }
  private weightedPick(pool: Recommendation[], limit: number): Recommendation[] {
    const available = [...pool],
      picked: Recommendation[] = [];
    while (available.length && picked.length < limit) {
      const total = available.reduce((sum, item) => sum + Math.max(item.score, 0.01), 0);
      let cursor = this.rng() * total;
      const index = available.findIndex((item) => (cursor -= Math.max(item.score, 0.01)) <= 0);
      picked.push(...available.splice(index < 0 ? available.length - 1 : index, 1));
    }
    return picked;
  }
  getChampion(id: string): Promise<Champion | null> {
    return this.champions.getChampionById(id);
  }
  async banRecommendations(
    championId: string,
    position: Position,
    limit = 3,
  ): Promise<BanRecommendation[]> {
    const [all, matchups] = await Promise.all([
      this.champions.getChampions(),
      this.stats.getMatchups(championId, position),
    ]);
    if (!matchups.length) return [];
    const gameRange = range(matchups.map((matchup) => Math.log1p(matchup.games)));
    const pickRange = range(matchups.map((matchup) => matchup.opponentPickRate));
    return matchups
      .flatMap((matchup) => {
        const champion = all.find((c) => c.id === matchup.opponentId);
        if (!champion || !champion.positions.includes(position)) return [];
        const score =
          (1 - matchup.championWinRate) * 0.6 +
          normalize(matchup.opponentPickRate, ...pickRange) * 0.25 +
          normalize(Math.log1p(matchup.games), ...gameRange) * 0.15;
        return [{ champion, matchup, score }];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
