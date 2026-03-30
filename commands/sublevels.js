import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { activeRuns, sendTrackerPost, persistActiveRuns, resolvePassword } from '../utility/sublevel_handler.js';
import { getCustomCommandContent, customCommandExists } from '../utility/custom_commands.js';

async function startRun(channelId, password, level, userId, replyFn, channel) {
    const run = { floors: 0, finalized: new Set(), characters: new Map(), startMessageId: null, password, level };
    activeRuns.set(channelId, run);
    await persistActiveRuns();

    const content = await getCustomCommandContent('sublevels', userId);
    if (content && !content.editIn) {
        await replyFn(content);
    } else if (content && content.editIn) {
        const sendOptions = {};
        if (content.editIn.initialContent) sendOptions.content = content.editIn.initialContent;
        if (content.image) sendOptions.files = [{ attachment: content.image }];
        const reply = await replyFn({ ...sendOptions, fetchReply: true });
        await new Promise(resolve => setTimeout(resolve, content.editIn.delayMs));
        const editOptions = { embeds: [content.editIn.embed] };
        if (content.editIn.components && content.editIn.components.length > 0) {
            editOptions.components = content.editIn.components;
        }
        await reply.edit(editOptions);
    } else {
        await replyFn('🏢 Starting sublevel run!');
    }

    await sendTrackerPost({ channel }, run);
}

async function confirmOverwrite(replyFn, userId) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sl:overwrite:yes').setLabel('Yes, overwrite').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('sl:overwrite:no').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    const prompt = await replyFn({
        content: '⚠️ There is already an active sublevel run in this channel. Do you want to overwrite it?',
        components: [row],
        fetchReply: true,
    });

    try {
        const pressed = await prompt.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: i => i.user.id === userId,
            time: 30_000,
        });
        await pressed.deferUpdate();
        const confirmed = pressed.customId === 'sl:overwrite:yes';
        await prompt.edit({ content: confirmed ? '⚠️ Overwriting previous run…' : '❌ Cancelled — keeping the current run.', components: [] });
        return confirmed;
    } catch {
        await prompt.edit({ content: '⏰ No response — keeping the current run.', components: [] });
        return false;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('sublevels')
        .setDescription('Start a new sublevel run in this channel.')
        .addStringOption(option =>
            option.setName('password')
                .setDescription('???')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('level')
                .setDescription('Where are we going?')
                .setRequired(false)),

    async execute(interaction) {
        const channelId = interaction.channel.id;
        const passwordInput = interaction.options.getString('password') || null;
        const password = resolvePassword(passwordInput);
        const levelInput = interaction.options.getString('level') || 'depth1';
        const level = customCommandExists(`sublevels_${levelInput}`) ? levelInput : 'depth1';

        if (activeRuns.has(channelId)) {
            const confirmed = await confirmOverwrite(opts => interaction.reply(opts), interaction.user.id);
            if (!confirmed) return;
            await startRun(channelId, password, level, interaction.user.id, msg => interaction.followUp(msg), interaction.channel);
        } else {
            await startRun(channelId, password, level, interaction.user.id, msg => interaction.reply(msg), interaction.channel);
        }
    },

    async executePrefix(message) {
        const channelId = message.channel.id;
        const args = message.content.trim().split(/\s+/).slice(1);
        const passwordInput = args[0] || null;
        const password = resolvePassword(passwordInput);

        const levelArg = args[1] || 'depth1';
        const level = customCommandExists(`sublevels_${levelArg}`) ? levelArg : 'depth1';

        if (activeRuns.has(channelId)) {
            const confirmed = await confirmOverwrite(opts => message.reply(opts), message.author.id);
            if (!confirmed) return;
        }

        await startRun(channelId, password, level, message.author.id, msg => message.reply(msg), message.channel);
    },
};
