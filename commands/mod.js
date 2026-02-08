import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import{ fork } from 'node:child_process'
import { AB_DATA } from '../initialize-data.js';

const registerSubcommand = new SlashCommandSubcommandBuilder()
    .setName('register')
    .setDescription('Register new commands')


/**
 * Description placeholder
 *
 * @async
 * @param {CommandInteraction} interaction 
 */
async function mainFunction(interaction) {

    return await register(interaction);

}


/**
 * Description placeholder
 *
 * @async
 * @param {CommandInteraction} interaction 
 * @returns {*} 
 */
async function register(interaction){
    await interaction.deferReply();
    await AB_DATA.pullData();

    //will try run the deploy-commands.js file
    let invoked = false;
    const registerPath = './deploy-commands.js'

    let process = fork(registerPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        let err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

    async function callback(err){
        if(err){
            const message = `Error registering commands! ${err}`;
            await interaction.editReply(message)
        }
        else{
            await interaction.editReply("Successfully registered commands!")
        }
    }
    

}

const commandBuilder = 
    new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Mod-only commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(registerSubcommand);


export default{
    data: commandBuilder,
    async execute(interaction) {
        await mainFunction(interaction);
    },
}