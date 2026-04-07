import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';

const MEDALS = ['🥇', '🥈', '🥉'];

const SORT_OPTIONS = [
    { label: 'Most Runs → Best Floor', value: 'runs_bestfloor', description: 'Sort by run count, then best floor' },
    { label: 'Best Floor → Most Runs', value: 'bestfloor_runs', description: 'Sort by best single floor, then runs' },
    { label: 'Total Floors', value: 'totalfloors', description: 'Sort by cumulative floors cleared' },
    { label: 'Weekly — Most Runs', value: 'weekly_runs', description: 'This week only, sorted by runs' },
    { label: 'Weekly — Best Floor', value: 'weekly_bestfloor', description: 'This week only, sorted by best floor' },
];

const DEFAULT_SORT = 'runs_bestfloor';

function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day;
    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function aggregatePlayers(runs) {
    const players = new Map();
    for (const run of runs) {
        const entry = players.get(run.id) || { name: run.name, runs: 0, bestFloors: 0, totalFloors: 0 };
        entry.runs++;
        entry.totalFloors += run.floors;
        if (run.floors > entry.bestFloors) entry.bestFloors = run.floors;
        players.set(run.id, entry);
    }
    return [...players.values()];
}

function sortPlayers(players, sortKey) {
    const key = sortKey.startsWith('weekly_') ? sortKey.replace('weekly_', '') : sortKey;
    switch (key) {
        case 'bestfloor_runs':
        case 'bestfloor':
            return players.sort((a, b) => b.bestFloors - a.bestFloors || b.runs - a.runs);
        case 'totalfloors':
            return players.sort((a, b) => b.totalFloors - a.totalFloors || b.runs - a.runs);
        case 'runs_bestfloor':
        case 'runs':
        default:
            return players.sort((a, b) => b.runs - a.runs || b.bestFloors - a.bestFloors);
    }
}

function buildSublevelBoard(runs, sortKey) {
    const weekly = sortKey.startsWith('weekly_');
    const filtered = weekly ? runs.filter(r => new Date(r.date) >= getWeekStart()) : runs;

    if (filtered.length === 0) {
        const title = weekly ? '🏢 Sublevels Weekly Leaderboard' : '🏢 Sublevels All-Time Leaderboard';
        return basicEmbed(title, 'No runs recorded yet. 🫗');
    }

    const players = aggregatePlayers(filtered);
    sortPlayers(players, sortKey);

    const lines = players.map((entry, idx) => {
        const rank = idx + 1;
        const prefix = rank <= 3 ? MEDALS[rank - 1] : `\`${rank}.\``;
        return `${prefix}  **${entry.name}** — \`${entry.runs}\` run${entry.runs !== 1 ? 's' : ''} · **Best:** \`${entry.bestFloors}\` floors · **Total:** \`${entry.totalFloors}\` floors`;
    });

    const sortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? sortKey;
    const title = weekly ? '🏢 Sublevels Weekly Leaderboard' : '🏢 Sublevels All-Time Leaderboard';
    return basicEmbed(title, `**Sorted by:** ${sortLabel}\n\n` + lines.join('\n'));
}

function buildSortDropdown(currentSort) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('slboard_sort')
        .setPlaceholder('Change sorting…')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(SORT_OPTIONS.map(o => ({
            label: o.label,
            value: o.value,
            description: o.description,
            default: o.value === currentSort,
        })));
    return new ActionRowBuilder().addComponents(menu);
}

function buildReply(runs, sortKey) {
    const embed = buildSublevelBoard(runs, sortKey);
    return { embeds: [embed], components: [buildSortDropdown(sortKey)] };
}

export default {
    data: new SlashCommandBuilder()
        .setName('sublevelboard')
        .setDescription('View the sublevel run leaderboard.'),

    async execute(interaction) {
        await interaction.deferReply();
        const runs = getTableData('sublevelRuns') || [];
        let sortKey = DEFAULT_SORT;

        const reply = await interaction.editReply(buildReply(runs, sortKey));

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300_000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'slboard_sort') {
                sortKey = i.values[0];
            }
            await i.update(buildReply(runs, sortKey));
        });

        collector.on('end', async () => {
            await interaction.deleteReply().catch(() => {});
        });
    },

    async executePrefix(message) {
        const runs = getTableData('sublevelRuns') || [];
        let sortKey = DEFAULT_SORT;

        const reply = await message.reply(buildReply(runs, sortKey));

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300_000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'slboard_sort') {
                sortKey = i.values[0];
            }
            await i.update(buildReply(runs, sortKey));
        });

        collector.on('end', async () => {
            await reply.delete().catch(() => {});
        });
    },
};
