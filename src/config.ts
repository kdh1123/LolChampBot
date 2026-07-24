import 'dotenv/config';
import { z } from 'zod';
export const environmentSchema = z.object({ DISCORD_TOKEN: z.string().min(1), DISCORD_CLIENT_ID: z.string().min(1), DISCORD_GUILD_ID: z.string().optional(), NODE_ENV: z.enum(['development', 'production', 'test']).default('development'), SESSION_TTL_MINUTES: z.coerce.number().positive().default(15) });
export const loadEnv = () => environmentSchema.parse(process.env);
export const difficultyConfig = { weights: { skillShot: 1, mechanics: 1, laning: 1, survival: 1, scaling: 1, decisionMaking: 1 }, boundaries: { easyMax: 1.6, mediumMax: 2.3 } } as const;
