import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';
import { capitalize } from '../utility/utils.js';

const FIELD_SIZE = 10;      // entries per embed field (column)
const FIELDS_PER_PAGE = 3;  // columns per page
const PAGE_SIZE = FIELD_SIZE * FIELDS_PER_PAGE; // 30 entries per page

const OC_FIELDS = [
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Pronouns', value: 'pronouns' },
    { label: 'Height', value: 'height' },
    { label: 'Birthday', value: 'birthday' },
    { label: 'Blood Type', value: 'bloodType' },
    { label: 'Mun', value: 'mun' },
];

const MUN_FIELDS = [
    { label: 'Timezone', value: 'timezone' },
    { label: 'Status', value: 'status' },
];

const ALL_FIELDS = [...OC_FIELDS, ...MUN_FIELDS];

// Fields where values should be grouped with counts in the summary
const CATEGORICAL_FIELDS = ['age', 'gender', 'pronouns', 'height', 'bloodType', 'status', 'timezone'];

function isMunField(field) {
    return MUN_FIELDS.some(f => f.value === field);
}

function extractCm(heightStr) {
    const match = heightStr.match(/(\d+)\s*cm/i);
    return match ? parseInt(match[1]) : 0;
}

function getFieldLabel(field) {
    return ALL_FIELDS.find(f => f.value === field)?.label ?? capitalize(field);
}

function buildListData(field) {
    if (isMunField(field)) {
        const muns = getTableData('muns');
        return muns
            .filter(m => m.status === 'Active' && m[field])
            .map(m => ({ name: m.name, value: m[field].trim() }))
            .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
    }

    const ocs = getTableData('ocs');
    return ocs
        .filter(oc => oc[field] && oc.name)
        .map(oc => ({
            name: oc.name.split(' ')[0],
            value: oc[field].trim(),
            mun: oc.mun,
        }))
        .sort((a, b) => {
            if (field === 'height') {
                const diff = extractCm(a.value) - extractCm(b.value);
                return diff !== 0 ? diff : a.value.localeCompare(b.value, undefined, { numeric: true });
            }
            return a.value.localeCompare(b.value, undefined, { numeric: true });
        });
}

function buildCategorySummary(entries) {
    const counts = new Map();
    for (const entry of entries) {
        counts.set(entry.value, (counts.get(entry.value) || 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([val, count]) => `${val} (${count})`)
        .join(', ');
}

function buildPage(entries, field, pageNum) {
    const label = getFieldLabel(field);
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const start = (pageNum - 1) * PAGE_SIZE;
    const chunk = entries.slice(start, start + PAGE_SIZE);

    if (entries.length === 0) {
        return {
            embed: basicEmbed(`📋 Listing: ${label}`, 'No data found for this field. 🫗'),
            totalPages,
        };
    }

    const title = totalPages > 1
        ? `📋 Listing: ${label} (${pageNum}/${totalPages})`
        : `📋 Listing: ${label}`;

    let description = '';
    if (CATEGORICAL_FIELDS.includes(field)) {
        const summary = buildCategorySummary(entries);
        description = `> **Summary:** ${summary}`;
    }

    const embed = basicEmbed(title, description);

    // Split chunk into columns of FIELD_SIZE
    for (let i = 0; i < chunk.length; i += FIELD_SIZE) {
        const column = chunk.slice(i, i + FIELD_SIZE);
        const lines = column.map(entry => {
            const nameDisplay = entry.mun
                ? `**${entry.name}** (${entry.mun})`
                : `**${entry.name}**`;
            return `\`${entry.value}\` — ${nameDisplay}`;
        });
        embed.addFields({ name: '\u200b', value: lines.join('\n'), inline: true });
    }

    return { embed, totalPages };
}

function buildFieldDropdown(currentField) {
    const options = ALL_FIELDS.map(f => ({
        label: f.label,
        value: f.value,
        description: `List all by ${f.label}`,
        default: f.value === currentField,
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('list_field_select')
        .setPlaceholder('Switch field…')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    return new ActionRowBuilder().addComponents(menu);
}

function buildNavButtons(pageNum, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('list_prev')
            .setLabel('‹ Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNum <= 1),
        new ButtonBuilder()
            .setCustomId('list_next')
            .setLabel('Next ›')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNum >= totalPages),
    );
}

function buildReply(entries, field, pageNum) {
    const { embed, totalPages } = buildPage(entries, field, pageNum);
    const components = [buildFieldDropdown(field)];
    if (totalPages > 1) components.push(buildNavButtons(pageNum, totalPages));
    return { embeds: [embed], components };
}

export default {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List character or member data by field.')
        .addStringOption(option =>
            option
                .setName('field')
                .setDescription('The field to list by')
                .setRequired(false)
                .addChoices(...ALL_FIELDS.map(f => ({ name: f.label, value: f.value }))),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        let field = interaction.options.getString('field') ?? 'age';
        let entries = buildListData(field);
        let pageNum = 1;

        const reply = await interaction.editReply(buildReply(entries, field, pageNum));

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300_000, // 5 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'list_field_select') {
                field = i.values[0];
                entries = buildListData(field);
                pageNum = 1;
            } else if (i.customId === 'list_next') {
                pageNum++;
            } else if (i.customId === 'list_prev') {
                pageNum--;
            }

            await i.update(buildReply(entries, field, pageNum));
        });

        collector.on('end', async () => {
            await interaction.deleteReply().catch(() => {});
        });
    },
    async executePrefix(message, args) {
        let field = args?.trim()?.toLowerCase() || 'age';
        const fieldMap = {};
        ALL_FIELDS.forEach(f => {
            fieldMap[f.value] = f.value;
            fieldMap[f.label.toLowerCase()] = f.value;
        });
        field = fieldMap[field] || 'age';
        let entries = buildListData(field);
        let pageNum = 1;
        const reply = await message.reply(buildReply(entries, field, pageNum));
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300_000,
        });
        collector.on('collect', async i => {
            if (i.customId === 'list_field_select') {
                field = i.values[0];
                entries = buildListData(field);
                pageNum = 1;
            } else if (i.customId === 'list_next') {
                pageNum++;
            } else if (i.customId === 'list_prev') {
                pageNum--;
            }
            await i.update(buildReply(entries, field, pageNum));
        });
        collector.on('end', async () => {
            await reply.delete().catch(() => {});
        });
    },
};
