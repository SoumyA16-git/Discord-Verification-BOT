import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from '../src/bot/events/interactionCreate.js';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DEV_GUILD_ID;

if (!token || !clientId) {
  console.error('\x1b[31m[ERROR] DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required to deploy commands.\x1b[0m');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);
const commandData = commands.map((cmd) => cmd.data.toJSON());

async function deploy() {
  try {
    console.log(`\x1b[34m[INFO] Deploying ${commandData.length} slash commands to Discord...\x1b[0m`);

    if (guildId) {
      console.log(`\x1b[34m[INFO] Registering to Development Guild (${guildId})...\x1b[0m`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
      console.log('\x1b[32m[SUCCESS] Successfully deployed commands to guild!\x1b[0m');
    } else {
      console.log('\x1b[34m[INFO] Registering Globally (May take a few minutes to propagate)...\x1b[0m');
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      console.log('\x1b[32m[SUCCESS] Successfully deployed global slash commands!\x1b[0m');
    }
  } catch (error) {
    console.error('\x1b[31m[ERROR] Failed to deploy commands:\x1b[0m', error);
    process.exit(1);
  }
}

deploy();
