import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { AB_DATA } from '../initialize-data.js';
import { basicEmbed } from '../utility/format_embed.js';

let allCommandOptions = AB_DATA.allCustomCommandOptions;

let data = new SlashCommandBuilder()
    .setName('get')
    .setDescription('Get info, links, etc.');
                
const stringOption = new SlashCommandStringOption()
    .setName('what')
    .setDescription('What do you want to get?')
    .setRequired(true);

for(const name of allCommandOptions){
    stringOption.addChoices({name: name, value: name});
}

data.addStringOption(stringOption);

export default{
    data: data,
    async execute(interaction) {

        const commandInfo = AB_DATA.getCustomCommand(interaction.options.getString('what'));

        if(commandInfo.getProp('Embed?')==="TRUE"){
            const embedMessage = basicEmbed(
            commandInfo.getProp('Title'), 
            commandInfo.getProp('Description'),
            commandInfo.getProp('Thumbnail'),
            commandInfo.getProp('Image'),
            commandInfo.getProp('Link')
            )

            await interaction.reply(
                {
                    embeds: [embedMessage]
                }
            );
        }
        else{
            const message = commandInfo.getProp('Title');
            await interaction.reply({
                content: message});
        }
        
    },
}