import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Mun } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add scrip to your wallet')
        .addIntegerOption((option)=>
            option
                .setName('amount')
                .setMinValue(0)
                .setRequired(true)
                .setDescription('Amount to add')
        )
        .addUserOption((option)=>
            option
                .setName('user')
                .setDescription('The user whose wallet you want to add to. Defaults to you.')
        )
        

/**
 * change wallet amount
 *
 * @param {CommandInteraction} interaction 
 * @param {string} action - what to do 
 * @param {number} amount - amount to change by
 * @param {Mun} mun - Mun to affect
 */
async function changeWallet(interaction, amount, mun){
    
    let actionMessage;
    const thumbnail = 'https://p0.piqsels.com/preview/28/212/916/coin-coins-money-finance.jpg';

    await mun.addScrip(amount)
    actionMessage = 
    `**\`\`\`Added ${amount} scrip to ${mun.name}'s wallet.\`\`\`**
    💰 **NEW BALANCE:** \`${mun.scrip}\` scrip`;

    const embed = basicEmbed('Manage Wallet', actionMessage, thumbnail,'','',false)
    embed.setColor("#acd46e");

    await interaction.reply({embeds: [embed]});
}

async function mainFunction(interaction){

    let amount = interaction.options.getInteger('amount');
    
    let userOption = interaction.options.getUser('user');

    if(userOption === null){
        userOption = interaction.user
    }
    const allMuns = await getTableData('muns')
    const munName = allMuns.find(row=>row.id === userOption.id).name
    const mun = new Mun(munName);

    await changeWallet(interaction, amount, mun);

}

export default{
    data: commandBuilder,
    async execute(interaction) {

        await mainFunction(interaction);

    },
}