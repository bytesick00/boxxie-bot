import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { addStandardFormat } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';
import { Character } from '../utility/classes.js';

const COMPARE_FIELDS = [
    { key: 'age', label: 'AGE' },
    { key: 'gender', label: 'GENDER' },
    { key: 'pronouns', label: 'PRONOUNS' },
    { key: 'height', label: 'HEIGHT' },
    { key: 'birthday', label: 'BIRTHDAY' },
    { key: 'bloodType', label: 'BLOOD TYPE' },
];

const STAT_FIELDS = [
    { key: 'wit', label: 'WIT', stat: true },
    { key: 'cha', label: 'CHA', stat: true },
    { key: 'str', label: 'STR', stat: true },
    { key: 'mve', label: 'MVE', stat: true },
    { key: 'dur', label: 'DUR', stat: true },
    { key: 'lck', label: 'LCK', stat: true },
];

const ALL_FIELDS = [...COMPARE_FIELDS, ...STAT_FIELDS];

const FIELD_CHOICES = ALL_FIELDS.map(f => ({ name: f.label, value: f.key }));

function getValue(oc, field) {
    if (field.stat) return `${oc.currentStats[field.key]}`;
    return `${oc[field.key]}`;
}

function buildCompareEmbed(characters, fields) {
    const names = characters.map(c => `**${c.name}**`).join(' vs ');
    const embed = new EmbedBuilder().setTitle(`📊 Compare`).setDescription(names);

    for (const field of fields) {
        const values = characters.map(c => {
            const val = getValue(c, field);
            return `${c.name}: \`${val || '—'}\``;
        }).join('\n');

        embed.addFields({ name: `\`${field.label}\``, value: values, inline: fields.length > 1 });
    }

    return addStandardFormat(embed);
}

const data = new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare multiple OCs side by side.')
    .addStringOption(option =>
        option
            .setName('oc1')
            .setDescription('First OC name')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('oc2')
            .setDescription('Second OC name')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('oc3')
            .setDescription('Third OC name (optional)')
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('oc4')
            .setDescription('Fourth OC name (optional)')
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('oc5')
            .setDescription('Fifth OC name (optional)')
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('field')
            .setDescription('Compare a specific field (leave empty to compare everything)')
            .addChoices(...FIELD_CHOICES)
    );

export default {
    data,
    async execute(interaction) {
        await interaction.deferReply();

        const ocNames = ['oc1', 'oc2', 'oc3', 'oc4', 'oc5']
            .map(key => interaction.options.getString(key))
            .filter(Boolean);

        const characters = [];
        for (const name of ocNames) {
            try {
                characters.push(new Character(name));
            } catch {
                await interaction.editReply(`I couldn't find an OC named **${name}** :( Please use the autocomplete to select your OC.`);
                return;
            }
        }

        const fieldKey = interaction.options.getString('field');
        const fields = fieldKey
            ? ALL_FIELDS.filter(f => f.key === fieldKey)
            : ALL_FIELDS;

        await interaction.editReply({ embeds: [buildCompareEmbed(characters, fields)] });
    },
    async autocomplete(interaction) {
        let choices = getTableData('ocs').map(row => row.name);
        const focusedValue = interaction.options.getFocused();
        let filtered = choices.filter(choice =>
            choice.toLowerCase().startsWith(focusedValue.toLowerCase())
        );
        if (filtered.length > 25) filtered = filtered.slice(0, 25);
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    },
    async executePrefix(message, args) {
        if (!args) {
            await message.reply('Usage: `?compare <oc1>, <oc2> [, oc3...] [field]`\nFields: age, gender, pronouns, height, birthday, bloodType, wit, cha, str, mve, dur, lck');
            return;
        }

        const fieldKeys = ALL_FIELDS.map(f => f.key.toLowerCase());
        const parts = args.split(',').map(s => s.trim()).filter(Boolean);

        // Check if the last part (or last word of last part) is a field name
        let fieldKey = null;
        const lastPart = parts[parts.length - 1];
        const lastWord = lastPart.split(/\s+/).pop().toLowerCase();
        if (fieldKeys.includes(lastWord)) {
            fieldKey = lastWord;
            // Remove field from the last part
            const trimmed = lastPart.slice(0, lastPart.length - lastWord.length).trim();
            if (trimmed) {
                parts[parts.length - 1] = trimmed;
            } else {
                parts.pop();
            }
        }

        if (parts.length < 2) {
            await message.reply('Please provide at least 2 OC names separated by commas.');
            return;
        }

        const characters = [];
        for (const name of parts) {
            try {
                characters.push(new Character(name));
            } catch {
                await message.reply(`I couldn't find an OC named **${name}**.`);
                return;
            }
        }

        const fields = fieldKey
            ? ALL_FIELDS.filter(f => f.key === fieldKey)
            : ALL_FIELDS;

        await message.reply({ embeds: [buildCompareEmbed(characters, fields)] });
    },
};
