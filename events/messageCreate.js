import { Events } from 'discord.js';
import { getTableData } from '../utility/access_data.js';
import { handlePrefixCommand, getCommandList } from '../utility/custom_commands.js';
import { basicEmbed } from '../utility/format_embed.js';
import { activeRuns, persistActiveRuns } from '../utility/sublevel_handler.js';

// Commands with special sublevel tracking behavior (floorup/floordown/lb stay inline)
const SUBLEVEL_COMMANDS = new Set(['floorup', 'floordown', 'lb']);
const BUILTIN_PREFIX = new Set([...SUBLEVEL_COMMANDS, 'commands']);

function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const content = message.content.trim();
        if (!content.startsWith('?')) return;

        const cmdName = content.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
        if (!cmdName) return;

        const channelId = message.channel.id;

        // --- !floorup / !floordown — Advance a floor + show floor content from sheet ---
        if (cmdName === 'floorup' || cmdName === 'floordown') {
            const run = activeRuns.get(channelId);
            if (!run) {
                await message.reply('No active sublevel run in this channel. Start one with `!sublevels`.');
                return;
            }
            run.floors++;
            await persistActiveRuns();
            try {
                await handlePrefixCommand(message);
            } catch (e) {
                console.error('Error executing floor command:', e);
            }
            // Tag every participant in the run
            const uniqueUserIds = [...new Set([...run.characters.values()].map(c => c.userId).filter(Boolean))];
            if (uniqueUserIds.length > 0) {
                await message.channel.send(uniqueUserIds.map(id => `<@${id}>`).join(' '));
            }
            return;
        }

        // --- !lb — Weekly sublevel leaderboard ---
        if (cmdName === 'lb') {
            const runs = getTableData('sublevelRuns') || [];
            const cutoff = getWeekStart();
            const filtered = runs.filter(r => new Date(r.date) >= cutoff);

            if (filtered.length === 0) {
                await message.reply({ embeds: [basicEmbed('🏢 Sublevels Weekly Leaderboard', 'No runs recorded this week yet. 🫗')] });
                return;
            }

            const players = new Map();
            for (const run of filtered) {
                const entry = players.get(run.id) || { name: run.name, runs: 0 };
                entry.runs++;
                players.set(run.id, entry);
            }

            const sorted = [...players.values()].sort((a, b) => b.runs - a.runs);
            const MEDALS = ['🥇', '🥈', '🥉'];
            const lines = sorted.map((entry, idx) => {
                const rank = idx + 1;
                const prefix = rank <= 3 ? MEDALS[rank - 1] : `\`${rank}.\``;
                return `${prefix}  **${entry.name}** — ${entry.runs} run${entry.runs !== 1 ? 's' : ''}`;
            });

            await message.reply({ embeds: [basicEmbed('🏢 Sublevels Weekly Leaderboard', lines.join('\n'))] });
            return;
        }

        // --- !commands — List available commands ---
        if (cmdName === 'commands') {
            const commands = getCommandList();
            if (commands.length === 0) {
                await message.reply('No custom commands available.');
                return;
            }
            const list = commands.map(c => c.count > 1 ? `\`!${c.name}\` (${c.count} variants)` : `\`!${c.name}\``);
            await message.reply(`**Available Commands:**\n${list.join(', ')}`);
            return;
        }

        // --- Registered slash commands (also usable as prefix) ---
        const registeredCommand = message.client.commands.get(cmdName);
        if (registeredCommand && registeredCommand.executePrefix) {
            const args = content.slice(1).trim().slice(cmdName.length).trim();
            try {
                await registeredCommand.executePrefix(message, args);
            } catch (error) {
                console.error(`Error executing prefix command ${cmdName}:`, error);
                try {
                    await message.reply('There was an error while executing this command!');
                } catch {}
            }
            return;
        }

        // --- Custom prefix commands from sheet ---
        if (!BUILTIN_PREFIX.has(cmdName)) {
            try {
                await handlePrefixCommand(message);
            } catch (e) {
                console.error('Error executing custom command:', e);
            }
        }
    },
};
