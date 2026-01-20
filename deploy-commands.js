import { REST, Routes } from 'discord.js';
import "dotenv/config";
import { dynamicImport } from './dynamic-import.js';

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
dynamicImport('commands', './commands/utility').then((commands)=>{
    (async () => {
        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // The put method is used to fully refresh all commands globally with the current set
            const data = await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands.map(command => (command.data)) });

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
        }
        })();
})