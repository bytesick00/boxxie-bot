import {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
} from 'discord.js';
import { parseDice, applyHPChange, activeRuns, updateTrackerPost } from '../utility/sublevel_handler.js';
import { Character } from '../utility/classes.js';
import { basicEmbed } from '../utility/format_embed.js';
import { getCustomCommandContent } from '../utility/custom_commands.js';

const data = new SlashCommandBuilder()
    .setName('hp')
    .setDescription("Change a character's HP during a sublevel run.")
    .addStringOption(option =>
        option
            .setName('character')
            .setDescription('The character to affect')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
            .setName('amount')
            .setDescription('Dice (e.g. 2d6) or a number (e.g. 5)')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('type')
            .setDescription('Hurt or heal?')
            .setRequired(true)
            .addChoices(
                { name: 'Hurt', value: 'hurt' },
                { name: 'Heal', value: 'heal' },
            )
    );

export default {
    data,
    async execute(interaction) {
        const characterName = interaction.options.getString('character');
        const amountStr = interaction.options.getString('amount');
        const type = interaction.options.getString('type');

        await interaction.deferReply();

        // Parse the amount (dice notation or plain number)
        const parsed = parseDice(amountStr);
        if (!parsed) {
            await interaction.editReply({
                components: [
                    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '### ❌ Invalid amount!\nUse dice notation (e.g. `2d6`) or a plain number (e.g. `5`).'
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2,
            });
            return;
        }

        // Animated dice roll if more than one die
        if (parsed.rolls.length > 1) {
            const diceEmoji = '🎲';
            const numDice = parsed.rolls.length;

            await interaction.editReply({
                components: [
                    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 🎲 Rolling ${amountStr} for **${characterName}**...\n${diceEmoji.repeat(numDice)}`
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2,
            });

            const revealedRolls = [];
            for (let i = 0; i < numDice; i++) {
                await new Promise(resolve => setTimeout(resolve, 600));
                revealedRolls.push(parsed.rolls[i]);

                const revealed = revealedRolls.map(r => `**\`${r}\`**`).join(' ');
                const remaining = diceEmoji.repeat(numDice - i - 1);

                await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### 🎲 Rolling ${amountStr} for **${characterName}**...\n${revealed} ${remaining}`
                            )
                        )
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            await new Promise(resolve => setTimeout(resolve, 400));
        }

        // Apply HP change
        const result = applyHPChange(interaction.channel.id, characterName, parsed.total, type);

        if (result.error) {
            await interaction.editReply({
                components: [
                    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ❌ ${result.error}`)
                    )
                ],
                flags: MessageFlags.IsComponentsV2,
            });
            return;
        }

        // Build result display
        const emoji = type === 'heal' ? '💚' : '💔';
        const verb = type === 'heal' ? 'healed' : 'took';
        const arrow = type === 'heal' ? '⬆️' : '⬇️';

        const rollText = parsed.rolls.length > 1
            ? `${parsed.rolls.map(r => `**\`${r}\`**`).join(' ')} = **${parsed.total}**`
            : `**${parsed.total}**`;

        let image = '';
        try {
            const character = new Character(characterName);
            image = character.image || '';
        } catch { /* no image */ }

        const container = new ContainerBuilder().setAccentColor(11326574);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji} HP ${type === 'heal' ? 'Healed' : 'Damaged'}!`),
            new TextDisplayBuilder().setContent(
                `**${characterName}** ${verb} ${rollText} ${type === 'heal' ? 'healing' : 'damage'}!`
            ),
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${arrow} **HP:** \`${result.oldHP}\` ➡️ \`${result.newHP}\``
            ),
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        // Update the tracker post to reflect new HP
        const run = activeRuns.get(interaction.channel.id);
        await updateTrackerPost(interaction.channel, run);

        // Zero HP — character is about to pass out
        if (result.hitZero) {
            await sendZeroHPMessage(interaction.channel, characterName, image);
        }

        // Revived from 0 HP
        if (result.revived) {
            await sendReviveMessage(interaction.channel, characterName, image);
        }
    },

    async autocomplete(interaction) {
        const channelId = interaction.channel.id;
        const run = activeRuns.get(channelId);

        if (!run || run.characters.size === 0) {
            await interaction.respond([]);
            return;
        }

        const focusedValue = interaction.options.getFocused().toLowerCase();
        const names = [...run.characters.keys()];
        const filtered = names.filter(name => name.toLowerCase().startsWith(focusedValue));

        await interaction.respond(
            filtered.slice(0, 25).map(name => ({ name, value: name }))
        );
    },
    async executePrefix(message, args) {
        if (!args) {
            await message.reply('Usage: `!hp <character> <amount> <hurt|heal>`');
            return;
        }
        const parts = args.trim().split(/\s+/);
        if (parts.length < 3) {
            await message.reply('Usage: `!hp <character> <amount> <hurt|heal>`');
            return;
        }
        const type = parts[parts.length - 1].toLowerCase();
        if (type !== 'hurt' && type !== 'heal') {
            await message.reply('Type must be `hurt` or `heal`.');
            return;
        }
        const amountStr = parts[parts.length - 2];
        const characterName = parts.slice(0, -2).join(' ');
        const parsed = parseDice(amountStr);
        if (!parsed) {
            await message.reply('Invalid amount! Use dice notation (e.g. `2d6`) or a plain number (e.g. `5`).');
            return;
        }
        const result = applyHPChange(message.channel.id, characterName, parsed.total, type);
        if (result.error) {
            await message.reply(`\u274C ${result.error}`);
            return;
        }
        const emoji = type === 'heal' ? '\uD83D\uDC9A' : '\uD83D\uDC94';
        const verb = type === 'heal' ? 'healed' : 'took';
        const arrow = type === 'heal' ? '\u2B06\uFE0F' : '\u2B07\uFE0F';
        const rollText = parsed.rolls.length > 1
            ? `${parsed.rolls.map(r => `**\`${r}\`**`).join(' ')} = **${parsed.total}**`
            : `**${parsed.total}**`;
        const description = `**${characterName}** ${verb} ${rollText} ${type === 'heal' ? 'healing' : 'damage'}!\n${arrow} **HP:** \`${result.oldHP}\` \u27A1\uFE0F \`${result.newHP}\``;
        let image = '';
        try { image = new Character(characterName).image || ''; } catch {}
        const embed = basicEmbed(`${emoji} HP ${type === 'heal' ? 'Healed' : 'Damaged'}!`, description);
        await message.reply({ embeds: [embed] });
        const run = activeRuns.get(message.channel.id);
        if (run) await updateTrackerPost(message.channel, run);

        // Zero HP — character is about to pass out
        if (result.hitZero) {
            await sendZeroHPMessage(message.channel, characterName, image);
        }

        // Revived from 0 HP
        if (result.revived) {
            await sendReviveMessage(message.channel, characterName, image);
        }
    },
};

/**
 * Sends the zero-HP "about to pass out" message using flavor text from the "zerohp" custom command.
 */
async function sendZeroHPMessage(channel, characterName, image) {
    let flavorText = '';
    try {
        const content = await getCustomCommandContent('zerohp');
        if (content && content.content) {
            flavorText = content.content;
        } else if (content && content.embeds && content.embeds.length > 0) {
            flavorText = content.embeds[0].data?.description || '';
        } else if (typeof content === 'string') {
            flavorText = content;
        }
    } catch { /* no custom command found */ }

    const description = `**${characterName}** is about to pass out.`
        + (flavorText ? `\n\n${flavorText}` : '');

    const embed = basicEmbed('💀 Zero HP!', description, image);
    embed.setFooter({ text: `${characterName} hit zero HP` });

    await channel.send({ embeds: [embed] });
}

/**
 * Sends the revive message when a character is healed from 0 HP, using flavor text from the "revivehp" custom command.
 */
async function sendReviveMessage(channel, characterName, image) {
    let flavorText = '';
    try {
        const content = await getCustomCommandContent('revivehp');
        if (content && content.content) {
            flavorText = content.content;
        } else if (content && content.embeds && content.embeds.length > 0) {
            flavorText = content.embeds[0].data?.description || '';
        } else if (typeof content === 'string') {
            flavorText = content;
        }
    } catch { /* no custom command found */ }

    const description = `**${characterName}** ${flavorText || 'has been revived!'}`;

    const embed = basicEmbed('💖 Revived!', description, image);
    embed.setFooter({ text: `${characterName} was revived` });

    await channel.send({ embeds: [embed] });
}
