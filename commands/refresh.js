import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { AB_DATA } from '../initialize-data.js';
import { addStandardFormat, basicEmbed } from '../utility/format_embed.js';

export default{
    data: new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('Refreshes data from the AB database.'),
    async execute(interaction) {

        await AB_DATA.pullData();
        let embedMessage = basicEmbed('Data Refreshed!🍹', 'The bot has pulled the most recent data from the spreadsheet.');

        await interaction.reply(
            {
                embeds: [embedMessage],
                flags: [MessageFlags.Ephemeral]
            } 
        );
    },
}