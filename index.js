import 'discord.js'
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import 'dotenv/config';
import { AnomalyBoxData } from './utility/classes.js';
import { dynamicImportEvents } from './dynamic-import.js';

//#region Handle discord commands and events
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

dynamicImportEvents('./commands').then((commands)=>{
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
//#endregion

const SHEET_RANGES = [
        {
            sheet: "Mun Info",
            range: "A:G"
        },
        {
            sheet: "OC Info",
            range: "A:J"
        },
        {
            sheet: "Base Stats",
            range: "A:G"
        },
        {
            sheet: "All Items",
            range: "A:H"
        },
        {
            sheet: "Current Stats",
            range: "A:H"
        },
        {   sheet: "Inventory Rows",
            range: "A:D"
        },
        {
            sheet: "Mechanics",
            range: "A:C",
        },
        {
            sheet: "Flavor Text",
            range: "A:B"
        }
]

export const AB_DATA = await AnomalyBoxData.init(SHEET_RANGES);

//this line must be at the very end
client.login(process.env.DISCORD_TOKEN); //signs the bot in with token