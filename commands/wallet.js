import { SlashCommandBuilder, CommandInteraction, CommandInteractionOptionResolver, User } from 'discord.js';
import { Mun } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('View your wallet.')
        .addUserOption((option)=>
            option
                .setName('user')
                .setDescription('The user whose wallet you want to view. Defaults to you.')
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
 * main function
 *
 * @async
 * @param {CommandInteraction} interaction 
 */
async function mainFunction(interaction){
    
    let userOption = interaction.options.getUser('user');

    if(userOption === null){
        userOption = interaction.user
    }

    const allMuns = getTableData('muns')
    const munName = allMuns.find(row=>row.id === userOption.id).name
    const mun = new Mun(munName);
    
    await viewWallet(interaction, mun);

}

export default{
    data: commandBuilder,
    async execute(interaction) {
        await interaction.deferReply();
        await mainFunction(interaction);

    },
}