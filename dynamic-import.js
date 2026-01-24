import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// export function dynamicImport(modulesFolderName, relativeFilePath){
//     const promises = [];
//     const modules = [];
//     return new Promise((resolve, reject)=>{
//         (async function(){
//             const foldersPath = join(process.cwd(), modulesFolderName);
//             const moduleFolders = readdirSync(foldersPath);

//             for (const folder of moduleFolders) {
//                 // Grab all the module files from the modules directory you created earlier
//                 const modulesPath = join(foldersPath, folder);
//                 const moduleFiles = readdirSync(modulesPath).filter((file) => file.endsWith('.js'));
//                 for (const file of moduleFiles) {
//                     // console.log(file)
//                     const filePath = `${relativeFilePath}/${file}`;
//                         promises.push(
//                             // NOTE: import() is async; that is why this is promisified
//                             await import(filePath).then(module => {
//                                         return module;
                                    
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
//                     if (value.default) {
//                         //console.log(`Importing module: ${value.default.data.name}`)
//                         modules.push(value.default);
//                     }
//                 }
//                 resolve(modules);
//                 })
//             .catch(e => {console.error(e);});
//         })();
//     });
// }

export function dynamicImport(relativeFilePath){
    const promises = [];
    const events = [];
    return new Promise((resolve, reject)=>{
        (async function(){
                // Grab all the event files from the events directory you created earlier
                const eventFiles = readdirSync(relativeFilePath).filter((file) => file.endsWith('.js'));
                // console.log(eventFiles);
                for (const file of eventFiles) {
                    const filePath = `${relativeFilePath}/${file}`;
                        promises.push(
                            // NOTE: import() is async; that is why this is promisified
                            await import(filePath).then(event => {
                                    return event;
                            })
                        );
                    
                }
        
        // only resolve when all promises are done
        Promise.all(promises)
            .then(values => {
                for (const value of values) {
                    // I cherry-pick just the default exports, but other exports will be
                    // on this object
                    // console.log(value)
                    if (value.default) {
                        events.push(value.default);
                    }
                }
                resolve(events);
                })
            .catch(e => {console.error(e);});
        })();
    });
}