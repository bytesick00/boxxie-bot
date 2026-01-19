import { REST, Routes } from 'discord.js';
import "dotenv/config";
import { dynamicImport } from './dynamic-import.js';

// const commands = [];
// const promises = [];
// Grab all the command folders from the commands directory you created earlier
// function promiseExample3() {
//   const promises = [];
//   const modules = [];

//   return new Promise((resolve, reject) => {
//     let i = 0;
//     (async function() {
//       for (let dir of dirs) {
//         try {
//           // warn devs if module cannot be found
//           if (!existsSync(join(dir, "index.js"))) {
//             console.warn("WARNING: module does not exist for: ");
//           }
//           // dynamically import the typeDefs and resolvers
//           else {
//             promises.push(
//               // NOTE: import() is async; that is why this is promisified
//               await import(dir).then(module => {
//                 return {
//                   module
//                 };
//               })
//             );
//           }
//         } catch (e) {
//           console.warn("SKIPPING: Cannot dynamically load module:", e);
//         }
//         i++;
//       }

//       // only resolve when all promises are done
//       Promise.all(promises)
//         .then(values => {
//           for (const value of values) {
//             // I cherry-pick just the default exports, but other exports will be
//             // on this object
//             if (value.module.default) {
//               modules.push(value.module.default);
//             }
//           }

//           resolve(modules);
//         })
//         .catch(e => {
//           console.error(e);
//         });
//     })();
//   });
// }

// function loadModules(){
//     const promises = [];
//     const modules = [];
//     return new Promise((resolve, reject)=>{
//         (async function(){
//             const foldersPath = join(process.cwd(), 'commands');
//             const commandFolders = readdirSync(foldersPath);

//             let numCommandFiles = 0;
//             for (const folder of commandFolders) {
//                 // Grab all the command files from the commands directory you created earlier
//                 const commandsPath = join(foldersPath, folder);
//                 const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
//                 // console.log(commandFiles);
//                 // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
//                 for (const file of commandFiles) {
//                     numCommandFiles += 1;
//                     const filePath = `./commands/utility/${file}`;
                    
//                         promises.push(
//                             // NOTE: import() is async; that is why this is promisified
//                             await import(filePath).then(command => {
//                                 if ('data' in command.default && 'execute' in command.default) {
//                                     console.log(`Importing command ${command.default}`)
//                                     return command;
//                                 }
//                                 else{
//                                     console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
//                                 }
//                             })
//                         );
                    
//                 }
//             }
        
//         // only resolve when all promises are done
//         Promise.all(promises)
//             .then(values => {
//                 for (const value of values) {
//                     // I cherry-pick just the default exports, but other exports will be
//                     // on this object
//                     // console.log(value)
//                     if (value.default) {
//                     modules.push(value.default.data.toJSON());
//                     }
//                 }

//                 resolve(modules);
//                 })
//             .catch(e => {console.error(e);});
//         })();
//     });
// }
// const foldersPath = join(process.cwd(), 'commands');
// const commandFolders = readdirSync(foldersPath);

// let numCommandFiles = 0;
// for (const folder of commandFolders) {
// 	// Grab all the command files from the commands directory you created earlier
// 	const commandsPath = join(foldersPath, folder);
// 	const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
//     // console.log(commandFiles);
// 	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
// 	for (const file of commandFiles) {
//         numCommandFiles += 1;
// 		const filePath = `./commands/utility/${file}`;
// 		import(filePath).then((command)=>{
//             console.log(command.default);
//             console.log(typeof command)
//             if ('data' in command.default && 'execute' in command.default) {

//                 commands.push(command.default);
//             } else { 
//                 console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
//             }
//         })
		
// 	}
// }



// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
dynamicImport('commands', './commands/utility').then((commands)=>{
    (async () => {
        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // The put method is used to fully refresh all commands globally with the current set
            const data = await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands });

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
        }
        })();
})

