import 'discord.js'
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import 'dotenv/config';
import { initializeTables, initializeOCs, getTable } from './utility/dataFunctions.js';
import { dynamicImport, dynamicImportEvents } from './dynamic-import.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

//command handler
client.commands = new Collection(); 

dynamicImport('commands', './commands/utility').then((commands)=>{
  commands.forEach(command => {
        client.commands.set(command.data.name, command);
  });
})

dynamicImportEvents('./events').then((events)=>{
  events.forEach(event =>{
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  })
})

//this line must be at the very end
client.login(process.env.DISCORD_TOKEN); //signs the bot in with token