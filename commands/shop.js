import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

const commandBuilder = new SlashCommandBuilder()
        .setName('')
        .setDescription('')

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