import { Client, GatewayIntentBits } from 'discord.js';
import { wireBot, DiscordRecommendationController } from './bot.js';
import { loadEnv } from './config.js';
import { JsonChampionDataProvider, JsonChampionStatsProvider } from './data/providers.js';
import { RecommendationService } from './services/recommendation.js';
import { MemorySessionStore } from './services/session.js';
const env = loadEnv(); const client = new Client({ intents: [GatewayIntentBits.Guilds] }); const sessions = new MemorySessionStore(env.SESSION_TTL_MINUTES * 60_000); wireBot(client, new DiscordRecommendationController(new RecommendationService(new JsonChampionDataProvider(), new JsonChampionStatsProvider()), sessions)); setInterval(() => sessions.cleanup(), 60_000).unref(); await client.login(env.DISCORD_TOKEN);
