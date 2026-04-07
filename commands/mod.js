import { CommandInteraction, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import{ fork } from 'node:child_process'
import { cacheAllData } from '../utility/access_data.js';
import { TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, ContainerBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { isAdmin } from '../utility/utils.js';

const components = [
        new ContainerBuilder()
            .setAccentColor(11326574)
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL("https://64.media.tumblr.com/4f5160222de5db25d0f4c1adc8877c6e/b8c9606df47e4fff-fc/s1280x1920/889020a9500cf7ee566904988a677381b23173cf.jpg")
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## New Millennium Technologies Shop"),
                        new TextDisplayBuilder().setContent("**Don't want to click through a menu?**\nUse **`/shop view [item]`** to quickly view an item\nUse **`/shop buy [item]`** to quickly buy it!"),
                    ),
            ),
        new ContainerBuilder()
            .setAccentColor(11326574)
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("view")
                            .setEmoji({
                                name: "🔍",
                            })
                            .setCustomId("1a4c7606b4bd45458373ab9a9692b8f5"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("buy")
                            .setEmoji({
                                name: "💸",
                            })
                            .setCustomId("6009cef35b5845b7dd0d036b9972b340"),
                    ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("### :coin: `3902 scrip` | **NPC Slot**\n> *A slot for a recurring NPC. Please double check to make sure you need one! Not all NPCs need slots.*"),
            )
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("view")
                            .setEmoji({
                                name: "🔍",
                            })
                            .setCustomId("d1391264a1524ec59f11d09c5b45df9d"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("buy")
                            .setEmoji({
                                name: "💸",
                            })
                            .setCustomId("6f488a07d1b44674a6602858066569ed"),
                    ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("Page 1 / 3"),
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Previous Page")
                    .setCustomId("bc438775a41f4922adda47a9e496d758"),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel("Next Page")
                    .setCustomId("35f74d75d9504f5a89807d161bde591c"),
            ),
];



const registerSubcommand = new SlashCommandSubcommandBuilder()
    .setName('register')
    .setDescription('Register new commands')

const testComp = new SlashCommandSubcommandBuilder()
    .setName('testcomp')
    .setDescription('just testing shit lol')

/**
 * Description placeholder
 *
 * @async
 * @param {CommandInteraction} interaction 
 */
async function mainFunction(interaction) {

    if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: 'You need administrator permissions to use this command!', flags: MessageFlags.Ephemeral });
        return;
    }

    const choice = interaction.options.getSubcommand()

    switch (choice) {
        case 'register':
            
            return await register(interaction);
        
        case 'testcomp':
            
            return await test_comp(interaction)

        default:
            break;
    }

}

async function test_comp(interaction){
   await interaction.reply({
    components: components,
	flags: MessageFlags.IsComponentsV2
    })
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
    await cacheAllData();

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
        .addSubcommand(registerSubcommand)
        .addSubcommand(testComp)


export default{
    data: commandBuilder,
    async execute(interaction) {
        await mainFunction(interaction);
    },
    async executePrefix(message, args) {
        if (!isAdmin(message.member)) {
            await message.reply('You need administrator permissions to use this command!');
            return;
        }
        const subcommand = args?.trim().split(/\s+/)[0]?.toLowerCase();
        if (subcommand === 'register') {
            const reply = await message.reply('Registering commands...');
            await cacheAllData();
            let invoked = false;
            const registerPath = './deploy-commands.js';
            const childProcess = fork(registerPath);
            childProcess.on('error', function (err) {
                if (invoked) return;
                invoked = true;
                reply.edit(`Error registering commands! ${err}`).catch(() => {});
            });
            childProcess.on('exit', function (code) {
                if (invoked) return;
                invoked = true;
                if (code === 0) {
                    reply.edit('Successfully registered commands!').catch(() => {});
                } else {
                    reply.edit(`Error registering commands! Exit code: ${code}`).catch(() => {});
                }
            });
        } else {
            await message.reply('Available subcommands: `register`');
        }
    },
}