import { REST, Routes } from 'discord.js';
import 'dotenv/config'

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const COMMAND_ID = [1464761335861608612, ]
const GUILD_ID = process.env.DEV_GUILDID;
const CLIENT_ID = process.env.APP_ID

// for guild-based commands
rest
	.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, COMMAND_ID))
	.then(() => console.log('Successfully deleted guild command'))
	.catch(console.error);

// for global commands
try {
    rest
	.delete(Routes.applicationCommand(CLIENT_ID, COMMAND_ID))
	.then(() => console.log('Successfully deleted application command'))
	.catch(console.error);
}
catch{}
