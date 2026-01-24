import { REST, Routes } from 'discord.js';
import "dotenv/config";
import { dynamicImport } from './dynamic-import.js';

// SET THIS TO TRUE FOR GLOBAL COMMAND DEPLOYMENT
const deployGlobal = true;

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// DEV TESTING
const devRoutes = Routes.applicationGuildCommands(process.env.APP_ID, process.env.DEV_GUILDID);
//INSTALL GLOBAL
const globalRoutes = Routes.applicationCommands(process.env.APP_ID)
//
let routes;
if(deployGlobal === true){
    routes = globalRoutes 
} else {
    routes = devRoutes
}

// and deploy your commands!
dynamicImport('./commands').then((commands)=>{
    (async () => {
        try {
            if(deployGlobal){
                console.log("%cDeploying commands globally...", "color: yellow;")
            }
            else{
                console.log("%cDeploying commands to test server...", "color: yellow;")
            }
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // The put method is used to fully refresh all commands globally with the current set

            const data = await rest.put(routes, { 
                body: commands.map(command => (command.data)) });

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
        }
        })();
})