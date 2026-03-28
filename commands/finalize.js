import { SlashCommandBuilder } from 'discord.js';
import { activeRuns, persistActiveRuns } from '../utility/sublevel_handler.js';
import { addSublevelRun, getData } from '../utility/access_data.js';
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

        // Record a run for every registered character
        const now = new Date().toISOString();
        if (run.characters.size > 0) {
            for (const [charName, charData] of run.characters) {
                const mun = charData.userId ? getData('muns', 'id', charData.userId) : null;
                const name = mun ? mun.name : charName;
                await addSublevelRun({
                    id: charData.userId || 'unknown',
                    name,
                    floors: run.floors,
                    date: now,
                });
                run.finalized.add(charData.userId || charName);
            }
        } else {
            // Fallback: no registered characters, record for the person who finalized
            const userId = interaction.user.id;
            const mun = getData('muns', 'id', userId);
            const name = mun ? mun.name : interaction.user.displayName;
            await addSublevelRun({ id: userId, name, floors: run.floors, date: now });
            run.finalized.add(userId);
        }

        // Clean up the active run
        activeRuns.delete(channelId);
        await persistActiveRuns();

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

        const now = new Date().toISOString();
        if (run.characters.size > 0) {
            for (const [charName, charData] of run.characters) {
                const mun = charData.userId ? getData('muns', 'id', charData.userId) : null;
                const name = mun ? mun.name : charName;
                await addSublevelRun({
                    id: charData.userId || 'unknown',
                    name,
                    floors: run.floors,
                    date: now,
                });
                run.finalized.add(charData.userId || charName);
            }
        } else {
            const userId = message.author.id;
            const mun = getData('muns', 'id', userId);
            const name = mun ? mun.name : message.author.displayName;
            await addSublevelRun({ id: userId, name, floors: run.floors, date: now });
            run.finalized.add(userId);
        }

        activeRuns.delete(channelId);
        await persistActiveRuns();

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
