import { SlashCommandBuilder } from 'discord.js';
import { activeRuns, sendTrackerPost, persistActiveRuns, resolvePassword } from '../utility/sublevel_handler.js';
import { getCustomCommandContent } from '../utility/custom_commands.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sublevels')
        .setDescription('Start a new sublevel run in this channel.')
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Optional password to unlock a special floor pool.')
                .setRequired(false)),

    async execute(interaction) {
        const channelId = interaction.channel.id;
        const passwordInput = interaction.options.getString('password') || null;
        const password = resolvePassword(passwordInput);
        const run = { floors: 0, finalized: new Set(), characters: new Map(), startMessageId: null, password };
        activeRuns.set(channelId, run);
        await persistActiveRuns();

        // Pull text from the custom command named "sublevels"
        const content = await getCustomCommandContent('sublevels', interaction.user.id);
        if (content && !content.editIn) {
            await interaction.reply(content);
        } else if (content && content.editIn) {
            const sendOptions = {};
            if (content.editIn.initialContent) sendOptions.content = content.editIn.initialContent;
            if (content.image) sendOptions.files = [{ attachment: content.image }];
            const reply = await interaction.reply({ ...sendOptions, fetchReply: true });
            await new Promise(resolve => setTimeout(resolve, content.editIn.delayMs));
            const editOptions = { embeds: [content.editIn.embed] };
            if (content.editIn.components && content.editIn.components.length > 0) {
                editOptions.components = content.editIn.components;
            }
            await reply.edit(editOptions);
        } else {
            await interaction.reply('🏢 Starting sublevel run!');
        }

        // Send the tracker post with Register/Remove Character buttons
        await sendTrackerPost(interaction, run);
    },

    async executePrefix(message) {
        const channelId = message.channel.id;
        const args = message.content.trim().split(/\s+/).slice(1);
        const passwordInput = args[0] || null;
        const password = resolvePassword(passwordInput);
        const run = { floors: 0, finalized: new Set(), characters: new Map(), startMessageId: null, password };
        activeRuns.set(channelId, run);
        await persistActiveRuns();

        // Pull text from the custom command named "sublevels"
        const content = await getCustomCommandContent('sublevels', message.author.id);
        if (content && !content.editIn) {
            await message.reply(content);
        } else if (content && content.editIn) {
            const sendOptions = {};
            if (content.editIn.initialContent) sendOptions.content = content.editIn.initialContent;
            if (content.image) sendOptions.files = [{ attachment: content.image }];
            const sent = await message.reply(Object.keys(sendOptions).length > 0 ? sendOptions : { content: '...' });
            await new Promise(resolve => setTimeout(resolve, content.editIn.delayMs));
            const editOptions = { embeds: [content.editIn.embed] };
            if (content.editIn.components && content.editIn.components.length > 0) {
                editOptions.components = content.editIn.components;
            }
            await sent.edit(editOptions);
        } else {
            await message.reply('🏢 Starting sublevel run!');
        }

        await sendTrackerPost(message, run);
    },
};
