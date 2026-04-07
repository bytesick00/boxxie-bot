import 'discord.js'
import { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials, REST, Routes } from 'discord.js'
import 'dotenv/config';
import { dynamicImport } from './dynamic-import.js';
import { initCache } from './utility/access_data.js';
import { restoreActiveRuns } from './utility/sublevel_handler.js';

await initCache();
restoreActiveRuns();

//#region Handle discord commands and events
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction]
});

//command handler
client.commands = new Collection(); 

const commands = await dynamicImport('./commands');
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Auto-register slash commands with Discord on startup (globally + dev guild for instant updates)
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const commandData = commands.map(command => command.data);
try {
  const globalData = await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commandData });
  console.log(`Registered ${globalData.length} global slash commands.`);

  if (process.env.DEV_GUILDID) {
    const guildData = await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, process.env.DEV_GUILDID),
      { body: commandData }
    );
    console.log(`Registered ${guildData.length} guild slash commands to dev server.`);
  }
} catch (error) {
  console.error('Failed to register slash commands:', error);
}

const events = await dynamicImport('./events');
events.forEach(event =>{
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
});
//#endregion

//this line must be at the very end
client.login(process.env.DISCORD_TOKEN); //signs the bot in with token