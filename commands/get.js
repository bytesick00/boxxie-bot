import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
// import { AB_DATA } from '../initialize-data.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getData, getTableData } from '../utility/access_data.js';

const allCommands = await getTableData('customCommands')
const commandOptions = allCommands.map(row=>row.name)

let data = new SlashCommandBuilder()
    .setName('get')
    .setDescription('Get info, links, etc.');
                
const stringOption = new SlashCommandStringOption()
    .setName('what')
    .setDescription('What do you want to get?')
    .setRequired(true);

for(const name of commandOptions){
    stringOption.addChoices({name: name, value: name}); 
}

data.addStringOption(stringOption);

export default{
    data: data,
    async execute(interaction) {

        const commandInfo =  getData('customCommands', 'name', interaction.options.getString('what'))

        if(commandInfo.embed==="TRUE"){
            const embedMessage = basicEmbed(
            commandInfo.title, 
            commandInfo.description,
            commandInfo.thumbnail,
            commandInfo.image,
            commandInfo.link
            )

            await interaction.reply(
                {
                    embeds: [embedMessage]
                }
            );
        }
        else{
            const message = commandInfo.title;
            await interaction.reply({
                content: message});
        }
        
    },
    async executePrefix(message, args) {
        if (!args) {
            await message.reply('Please specify what to get! Usage: `!get <command>`');
            return;
        }
        const commandInfo = getData('customCommands', 'name', args.trim());
        if (!commandInfo) {
            await message.reply(`Could not find command "${args.trim()}".`);
            return;
        }
        if (commandInfo.embed === "TRUE") {
            const embedMessage = basicEmbed(
                commandInfo.title,
                commandInfo.description,
                commandInfo.thumbnail,
                commandInfo.image,
                commandInfo.link
            );
            await message.reply({ embeds: [embedMessage] });
        } else {
            await message.reply({ content: commandInfo.title });
        }
    },
}