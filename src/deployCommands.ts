import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { loadEnv } from './config.js';
const env = loadEnv(); const command = new SlashCommandBuilder().setName('챔피언추천').setDescription('포지션과 난이도에 맞는 챔피언을 추천합니다.'); const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN); const route = env.DISCORD_GUILD_ID ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID) : Routes.applicationCommands(env.DISCORD_CLIENT_ID); await rest.put(route, { body: [command.toJSON()] }); console.log('슬래시 명령어를 등록했습니다.');
