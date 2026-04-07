import { SlashCommandBuilder } from 'discord.js';
import { activeRuns, finalizeRun } from '../utility/sublevel_handler.js';
import { getCustomCommandContent } from '../utility/custom_commands.js';

export default {
    data: new SlashCommandBuilder()
        .setName('finalize')
        .setDescription('Finalize the active sublevel run in this channel.'),

    async execute(interaction) {
        const channelId = interaction.channel.id;
        const run = activeRuns.get(channelId);

        if (!run) {
            await interaction.reply({ content: 'No active sublevel run to finalize.', ephemeral: true });
            return;
        }

        if (run.finalized.size > 0) {
            await interaction.reply({ content: 'This run has already been finalized!', ephemeral: true });
            return;
        }

        await finalizeRun(interaction.channel, run, channelId, interaction.user.id);

        // Pull text from the custom command named "finalize"
        const content = await getCustomCommandContent('finalize', interaction.user.id);
        if (content && !content.editIn) {
            await interaction.reply(content);
        } else if (content && content.editIn) {
            const sendOptions = {};
            if (content.editIn.initialContent) sendOptions.content = content.editIn.initialContent;
            if (content.image) sendOptions.files = [{ attachment: content.image }];
            const reply = await interaction.reply({ ...sendOptions, fetchReply: true });
            await new Promise(resolve => setTimeout(resolve, content.editIn.delayMs));
            await reply.edit({ content: '', embeds: [content.editIn.embed] });
        } else {
            await interaction.reply(`🏢 Sublevel run finalized! Cleared **${run.floors}** floors.`);
        }
    },

    async executePrefix(message) {
        const channelId = message.channel.id;
        const run = activeRuns.get(channelId);

        if (!run) {
            await message.reply('No active sublevel run to finalize.');
            return;
        }

        if (run.finalized.size > 0) {
            await message.reply('This run has already been finalized!');
            return;
        }

        await finalizeRun(message.channel, run, channelId, message.author.id);

        const content = await getCustomCommandContent('finalize', message.author.id);
        if (content && !content.editIn) {
            await message.reply(content);
        } else if (content && content.editIn) {
            const sendOptions = {};
            if (content.editIn.initialContent) sendOptions.content = content.editIn.initialContent;
            if (content.image) sendOptions.files = [{ attachment: content.image }];
            const sent = await message.reply(Object.keys(sendOptions).length > 0 ? sendOptions : { content: '...' });
            await new Promise(resolve => setTimeout(resolve, content.editIn.delayMs));
            await sent.edit({ content: '', embeds: [content.editIn.embed] });
        } else {
            await message.reply(`🏢 Sublevel run finalized! Cleared **${run.floors}** floors.`);
        }
    },
};
