import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { getData, getTableData } from '../utility/access_data.js';
import { Mun } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Log a mission to get company scrip!')
        .addIntegerOption((option)=>
            option
                .setName('word-count')
                .setDescription('The word count for your mission')
                .setRequired(true)
        )
        .addUserOption((option)=>
            option
                .setName('user')
                .setDescription('The user to submit for. Defaults to you.')
        )

async function mainFunction(interaction){

    const wordPayout = getData('mechanics', 'type', 'Words');
    const wordCount = interaction.options.getInteger('word-count') 
    let payout = parseFloat(wordPayout.rate) * parseInt(wordCount);
    payout = Math.round(payout);

    let userOption = interaction.options.getUser('user');
    if(userOption === null){
        userOption = interaction.user
    }

    const allMuns = await getTableData('muns')
    const munName = allMuns.find(row=>row.id === userOption.id).name
    const thisMun = new Mun(munName);
    await thisMun.addScrip(payout)

    const title = `Submit Word Count`
    const message = 
        `**\`\`\`${wordCount} words = ${payout} scrip!\nAdded ${payout} scrip to ${thisMun.name}'s wallet!\`\`\`**
        💰 **NEW BALANCE:** \`${thisMun.scrip}\` scrip`
    const embed = basicEmbed('', message, '', '','', false)
    embed.setColor("#acd46e");

    await interaction.reply(
        {embeds: [embed]}
    )
}

export default{
    data: commandBuilder,
    async execute(interaction) {

        await mainFunction(interaction);

    },
}