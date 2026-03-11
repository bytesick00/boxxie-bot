import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import cache from "../data/cached-data.json" with { type: 'json' };

const commandBuilder = new SlashCommandBuilder()
        .setName('shop')
        .setDescription('view shop')

const shopData = cache.shop;

async function mainFunction(interaction){

    await interaction.reply(
        
    )
}

export default{
    data: commandBuilder,
    async execute(interaction) {

        await mainFunction(interaction);

    },
}