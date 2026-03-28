import { SlashCommandBuilder } from 'discord.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day;
    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function buildSublevelBoard(runs, weekly) {
    const cutoff = weekly ? getWeekStart() : null;

    const filtered = cutoff
        ? runs.filter(r => new Date(r.date) >= cutoff)
        : runs;

    if (filtered.length === 0) {
        const title = weekly ? '🏢 Sublevels Weekly Leaderboard' : '🏢 Sublevels All-Time Leaderboard';
        return [basicEmbed(title, 'No runs recorded yet. 🫗')];
    }

    // Aggregate per player: total runs, best single run (most floors), total floors
    const players = new Map();
    for (const run of filtered) {
        const entry = players.get(run.id) || { name: run.name, runs: 0, bestFloors: 0, totalFloors: 0 };
        entry.runs++;
        entry.totalFloors += run.floors;
        if (run.floors > entry.bestFloors) entry.bestFloors = run.floors;
        players.set(run.id, entry);
    }

    const sorted = [...players.values()].sort((a, b) => {
        if (b.bestFloors !== a.bestFloors) return b.bestFloors - a.bestFloors;
        return b.runs - a.runs;
    });

    const lines = sorted.map((entry, idx) => {
        const rank = idx + 1;
        const prefix = rank <= 3 ? MEDALS[rank - 1] : `\`${rank}.\``;
        return `${prefix}  **${entry.name}** — **Best:** \`${entry.bestFloors}\` floors · \`${entry.runs}\` run${entry.runs !== 1 ? 's' : ''}`;
    });

    const title = weekly ? '🏢 Sublevels Weekly Leaderboard' : '🏢 Sublevels All-Time Leaderboard';
    return [basicEmbed(title, lines.join('\n'))];
}

export default {
    data: new SlashCommandBuilder()
        .setName('sublevelboard')
        .setDescription('View the sublevel run leaderboard.')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Leaderboard time period')
                .addChoices(
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'All-Time', value: 'alltime' },
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const period = interaction.options.getString('period') || 'weekly';
        const runs = getTableData('sublevelRuns') || [];
        const embeds = buildSublevelBoard(runs, period === 'weekly');
        await interaction.editReply({ embeds });
    },
    async executePrefix(message, args) {
        const period = args?.toLowerCase() === 'alltime' ? 'alltime' : 'weekly';
        const runs = getTableData('sublevelRuns') || [];
        const embeds = buildSublevelBoard(runs, period === 'weekly');
        await message.reply({ embeds });
    },
};
