export const positions = ['탑', '정글', '미드', '원딜', '서포터'] as const;
export type Position = (typeof positions)[number];
export const difficulties = ['쉬움', '보통', '어려움'] as const;
export type Difficulty = (typeof difficulties)[number];

export interface DifficultyFactors { skillShot: number; mechanics: number; laning: number; survival: number; scaling: number; decisionMaking: number; }
export interface Champion { id: string; name: string; imageUrl: string; positions: Position[]; difficultyFactors: DifficultyFactors; }
export interface ChampionStats {
  championId: string; position: Position; winRate: number; pickRate: number; banRate: number; games: number;
  patch: string; tierRange: string; region: string; updatedAt: string; source: string; isDemo: boolean; reason: string;
}
export interface MatchupStats {
  championId: string; opponentId: string; position: Position; championWinRate: number; opponentPickRate: number; opponentBanRate?: number;
  games: number; patch: string; tierRange: string; region: string; source: string; updatedAt: string; isDemo: boolean;
}
export interface StatsProviderMetadata { providerName: string; sourceUrl?: string; patch?: string; tierRange?: string; region?: string; fetchedAt?: string; isDemo: boolean; }
export interface ChampionDataProvider { getChampions(): Promise<Champion[]>; getChampionById(id: string): Promise<Champion | null>; }
export interface ChampionStatsProvider { getStats(position: Position): Promise<ChampionStats[]>; getMatchups(championId: string, position: Position): Promise<MatchupStats[]>; getMetadata(): Promise<StatsProviderMetadata>; }
export interface RecommendationSession { id: string; userId: string; guildId?: string; channelId: string; selectedPosition?: Position; selectedDifficulty?: Difficulty; recommendedChampionIds: string[]; selectedChampionId?: string; createdAt: number; expiresAt: number; }
