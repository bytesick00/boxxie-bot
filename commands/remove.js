import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Mun } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove scrip from your wallet.')
        .addIntegerOption((option)=>
            option
                .setName('amount')
                .setMinValue(0)
                .setRequired(true)
                .setDescription('Amount to remove')
        )
        .addUserOption((option)=>
            option
                .setName('user')
                .setDescription('The user whose wallet you want to remove from. Defaults to you.')
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

    try{
        await mun.removeScrip(amount)
        actionMessage = 
        `**\`\`\`Removed ${amount} scrip from ${mun.name}'s wallet.\`\`\`**`;
    }
    catch (error) {
        if(error.message === "Not enough scrip!"){
            actionMessage = 
            `**\`\`\`ERROR: Not enough scrip in ${mun.name}'s wallet, cannot remove ${amount} scrip!\`\`\`**
            💰 **BALANCE:** \`${mun.scrip}\` scrip`;
        }
        else{
            throw error;
        }

    }

    const embed = basicEmbed('Manage Wallet', actionMessage, thumbnail,'','',false)
    embed.setColor("#acd46e");
    embed.setFooter({ text: `💰 NEW BALANCE: ${mun.scrip} scrip` });

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
    async executePrefix(message, args) {
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 0) {
            await message.reply('Please provide a valid amount! Usage: `!remove <amount> [@user]`');
            return;
        }
        const user = message.mentions.users.first() || message.author;
        const allMuns = await getTableData('muns');
        const munData = allMuns.find(row => row.id === user.id);
        if (!munData) {
            await message.reply("Couldn't find that user's profile!");
            return;
        }
        const mun = new Mun(munData.name);
        let actionMessage;
        try {
            await mun.removeScrip(amount);
            actionMessage = `**\`\`\`Removed ${amount} scrip from ${mun.name}'s wallet.\`\`\`**`;
        } catch (error) {
            if (error.message === 'Not enough scrip!') {
                actionMessage = `**\`\`\`ERROR: Not enough scrip in ${mun.name}'s wallet, cannot remove ${amount} scrip!\`\`\`**\n💰 **BALANCE:** \`${mun.scrip}\` scrip`;
            } else {
                throw error;
            }
        }
        const embed = basicEmbed('Manage Wallet', actionMessage, 'https://p0.piqsels.com/preview/28/212/916/coin-coins-money-finance.jpg', '', '', false);
        embed.setColor("#acd46e");
        embed.setFooter({ text: `💰 NEW BALANCE: ${mun.scrip} scrip` });
        await message.reply({ embeds: [embed] });
    },
}