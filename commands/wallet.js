import { SlashCommandBuilder, CommandInteraction, CommandInteractionOptionResolver, User } from 'discord.js';
import { AB_DATA } from '../initialize-data.js';
import { AnomalyBoxData, Mun } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Manage your wallet.')
        .addStringOption((option)=>
            option
                .setName('action')
                .setDescription('What do you want to do?')    
                .setRequired(true)
                .addChoices([
                    {name: 'view', value: 'view'},
                    {name: 'add', value: 'add'},
                    {name: 'remove', value: 'remove'}
                ])
        )
        .addIntegerOption((option)=>
            option
               .setName('amount')
               .setDescription('The amount of scrip to add or remove') 
               
        )
        .addUserOption((option)=>
            option
                .setName('user')
                .setDescription('The user to give/take scrip from. Defaults to you.')
        )


/**
 * view wallet amount
 *
 * @param {CommandInteraction} interaction
 * @param {Mun} mun - Mun to view 
 */
async function viewWallet(interaction, mun){
    const title = `${mun.name}'s Wallet`
    const message = `💰 \`${mun.scrip}\` scrip`
    const embed = basicEmbed(title, message,'','','',false);
    embed.setColor("#acd46e");

    await interaction.editReply({embeds: [embed]});
}


/**
 * change wallet amount
 *
 * @param {CommandInteraction} interaction 
 * @param {string} action - what to do 
 * @param {number} amount - amount to change by
 * @param {Mun} mun - Mun to affect
 */
async function changeWallet(interaction, action, amount, mun){
    
    let actionMessage;
    const thumbnail = 'https://p0.piqsels.com/preview/28/212/916/coin-coins-money-finance.jpg';

    if(action === 'add'){
        mun.addScrip(amount)
        actionMessage = 
        `**\`\`\`Added ${amount} scrip to ${mun.name}'s wallet.\`\`\`**
        💰 **NEW BALANCE:** \`${mun.scrip}\` scrip`;

    }
    else{
        mun.removeScrip(amount)
        actionMessage = 
        `**\`\`\`Removed ${amount} scrip from ${mun.name}'s wallet.\`\`\`**
        💰 **NEW BALANCE:** \`${mun.scrip}\` scrip`
    }

    const embed = basicEmbed('Manage Wallet', actionMessage, thumbnail,'','',false)
    embed.setColor("#acd46e");

    await interaction.editReply({embeds: [embed]});
}

/**
 * main function
 *
 * @async
 * @param {CommandInteraction} interaction 
 */
async function mainFunction(interaction){
    
    const actionChoice = interaction.options.getString('action');
    let amount = interaction.options.getInteger('amount');
    /**
     * @type {User}
     */
    let userOption = interaction.options.getUser('user');

    if(amount === null){
        amount = 0;
    }
    if(userOption === null){
        userOption = interaction.user
    }

    const mun = AB_DATA.getMun(userOption.id);
    
    if(actionChoice === 'view'){
        await viewWallet(interaction, mun);
    }
    else{
        await changeWallet(interaction, actionChoice, amount, mun);
    }

}

export default{
    data: commandBuilder,
    async execute(interaction) {
        await interaction.deferReply();

        await mainFunction(interaction);

    },
}