import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import { getData, getTableData, saveActiveRuns, loadActiveRuns } from './access_data.js';
import { Character } from './classes.js';
import { getCustomCommandContent } from './custom_commands.js';

// ---- Active runs per channel ----
// Key: channelId, Value: { floors, finalized, characters, startMessageId }
export const activeRuns = new Map();

/** Restore active runs from the database on startup. */
export function restoreActiveRuns() {
    const restored = loadActiveRuns();
    for (const [key, value] of restored) {
        activeRuns.set(key, value);
    }
    if (restored.size > 0) console.log(`Restored ${restored.size} active sublevel run(s) from cache.`);
}

/** Persist the current active runs to the database. */
export async function persistActiveRuns() {
    await saveActiveRuns(activeRuns);
}

/**
 * Look up a password in prefixCommands (command name "password").
 * Returns the matched command's text (the floor-pool key) if valid, or null.
 */
export function resolvePassword(input) {
    if (!input) return null;
    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return null;

    const trimmed = input.trim().toLowerCase();
    const match = allCommands.find(cmd =>
        cmd.command && cmd.command.trim().toLowerCase() === 'password'
        && cmd.text && cmd.text.trim().toLowerCase() === trimmed
    );
    return match ? match.text.trim() : null;
}

// ---- Pending registrations (ephemeral state per user) ----
const pendingRegistrations = new Map();
let regCounter = 0;
function nextRegId() {
    return `${Date.now().toString(36)}${(++regCounter).toString(36)}`;
}

// Cleanup expired pending registrations every 30 min
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of pendingRegistrations) {
        if (now - entry.created > 30 * 60 * 1000) pendingRegistrations.delete(key);
    }
}, 30 * 60 * 1000).unref();

// ---- Dice helpers ----

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Parse dice notation (e.g. "2d6") or a plain number (e.g. "5").
 * Returns { rolls: number[], total: number, notation: string } or null.
 */
export function parseDice(input) {
    const trimmed = input.trim();
    const diceMatch = trimmed.match(/^(\d*)d(\d+)$/i);
    if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        if (count < 1 || count > 100 || sides < 1 || sides > 1000) return null;
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(rollDie(sides));
        }
        return { rolls, total: rolls.reduce((a, b) => a + b, 0), notation: trimmed };
    }
    const num = parseInt(trimmed);
    if (!isNaN(num)) {
        return { rolls: [num], total: num, notation: trimmed };
    }
    return null;
}

// ---- OC helpers ----

/**
 * Get all active OC names (OCs whose mun has status "Active")
 */
function getActiveOCs() {
    const ocs = getTableData('ocs') || [];
    const muns = getTableData('muns') || [];
    const activeMuns = new Set(
        muns.filter(m => m.status && m.status.toLowerCase() === 'active').map(m => m.name)
    );
    if (activeMuns.size === 0) return ocs; // fallback: return all if no status data
    return ocs.filter(oc => activeMuns.has(oc.mun));
}

// ---- Tracker post (the persistent message showing registered characters) ----

function buildTrackerMessage(run) {
    const container = new ContainerBuilder().setAccentColor(11326574);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 🏢 Sublevel Run — Character Tracker')
    );

    if (run.characters.size === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*No characters registered yet. Click a button below to get started!*')
        );
    } else {
        let charList = '';
        for (const [name, data] of run.characters) {
            const hpDisplay = data.hp !== null ? `❤️ **${data.hp}/${data.maxHp}** HP` : '❤️ *HP not rolled*';
            const lckDisplay = data.luck !== null ? `🍀 **${data.luck}** LCK` : '🍀 *Luck not set*';
            charList += `> **${name}** — ${hpDisplay} | ${lckDisplay}\n`;
        }
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**```\n📋 CHARACTERS ON THIS RUN\n```**'),
            new TextDisplayBuilder().setContent(charList)
        );
    }

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel('Register Character')
            .setEmoji({ name: '➕' })
            .setCustomId('sl:register'),
        new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel('Remove Character')
            .setEmoji({ name: '➖' })
            .setCustomId('sl:remove'),
        new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel('Start Run')
            .setEmoji({ name: '🚀' })
            .setCustomId('sl:startrun')
            .setDisabled(run.characters.size === 0),
    );

    return {
        components: [container, buttons],
        flags: MessageFlags.IsComponentsV2,
    };
}

/**
 * Send the tracker post after !sublevels
 */
export async function sendTrackerPost(message, run) {
    const trackerMsg = await message.channel.send(buildTrackerMessage(run));
    run.startMessageId = trackerMsg.id;
    return trackerMsg;
}

/**
 * Update the existing tracker post
 */
export async function updateTrackerPost(channel, run) {
    if (!run || !run.startMessageId) return;
    try {
        const msg = await channel.messages.fetch(run.startMessageId);
        await msg.edit(buildTrackerMessage(run));
    } catch (e) {
        console.error('Could not update tracker post:', e);
    }
}

// ---- Main interaction handler for sl: components ----

export async function handleSublevelInteraction(interaction) {
    const customId = interaction.customId;
    if (!customId || !customId.startsWith('sl:')) return false;

    const channelId = interaction.channel.id;
    const run = activeRuns.get(channelId);

    try {
        // ---- Start Run button → post level descriptor ----
        if (customId === 'sl:startrun') {
            if (!run) {
                await interaction.reply({ content: 'No active sublevel run in this channel!', ephemeral: true });
                return true;
            }
            if (run.characters.size === 0) {
                await interaction.reply({ content: 'Register at least one character before starting!', ephemeral: true });
                return true;
            }

            const level = run.level || 'depth1';
            const commandName = `sublevels_${level}`;
            const content = await getCustomCommandContent(commandName, interaction.user.id);

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
                await interaction.reply(`🏢 Starting from level: **${level}**`);
            }

            return true;
        }

        // ---- Register Character button → opens modal ----
        if (customId === 'sl:register') {
            if (!run) {
                await interaction.reply({ content: 'No active sublevel run in this channel!', ephemeral: true });
                return true;
            }

            const modal = new ModalBuilder()
                .setCustomId('sl:modal:register')
                .setTitle('Register Character');

            const nameInput = new TextInputBuilder()
                .setCustomId('sl:modal:charname')
                .setLabel('Character name')
                .setPlaceholder('Type the full or partial name of your OC...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            await interaction.showModal(modal);
            return true;
        }

        // ---- Modal submit: character name typed ----
        if (customId === 'sl:modal:register') {
            if (!run) {
                await interaction.reply({ content: 'No active sublevel run in this channel!', ephemeral: true });
                return true;
            }

            const typed = interaction.fields.getTextInputValue('sl:modal:charname').trim();
            const activeOCs = getActiveOCs();

            // Fuzzy match: exact name → alias → startsWith name → startsWith alias → includes name → includes alias
            const lower = typed.toLowerCase();
            function matchesAlias(oc, input) {
                if (!oc.aka) return false;
                return oc.aka.split(/,/).some(a => a.trim().toLowerCase() === input);
            }
            function aliasStartsWith(oc, input) {
                if (!oc.aka) return false;
                return oc.aka.split(/,/).some(a => a.trim().toLowerCase().startsWith(input));
            }
            function aliasIncludes(oc, input) {
                if (!oc.aka) return false;
                return oc.aka.split(/,/).some(a => a.trim().toLowerCase().includes(input));
            }
            let match = activeOCs.find(oc => oc.name.toLowerCase() === lower);
            if (!match) match = activeOCs.find(oc => matchesAlias(oc, lower));
            if (!match) match = activeOCs.find(oc => oc.name.toLowerCase().startsWith(lower));
            if (!match) match = activeOCs.find(oc => aliasStartsWith(oc, lower));
            if (!match) match = activeOCs.find(oc => oc.name.toLowerCase().includes(lower));
            if (!match) match = activeOCs.find(oc => aliasIncludes(oc, lower));

            if (!match) {
                // Show closest matches as a hint (name or alias)
                const close = activeOCs
                    .filter(oc => oc.name.toLowerCase().includes(lower.slice(0, 3)) || aliasIncludes(oc, lower.slice(0, 3)))
                    .slice(0, 5)
                    .map(oc => `• ${oc.name}${oc.aka ? ` (${oc.aka})` : ''}`);
                const hint = close.length > 0
                    ? `\n\nDid you mean one of these?\n${close.join('\n')}`
                    : '\n\nPlease try clicking Register Character again.';
                await interaction.reply({
                    content: `### ❌ No OC found matching "${typed}"${hint}`,
                    ephemeral: true,
                });
                return true;
            }

            // Auto-fetch luck from current stats
            let luck = 0;
            try {
                const character = new Character(match.name);
                luck = parseInt(character.currentStats.lck) || 0;
            } catch { /* default 0 */ }

            const regId = nextRegId();
            pendingRegistrations.set(regId, {
                created: Date.now(),
                channelId,
                userId: interaction.user.id,
                characterName: match.name,
                hp: null,
                maxHp: null,
                luck,
                hpRolled: false,
            });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel('Roll for HP (8d6)')
                    .setEmoji({ name: '🎲' })
                    .setCustomId(`sl:rollhp:${regId}`),
            );

            await interaction.reply({
                content: `### 📋 Registering: **${match.name}**\n🍀 **Luck:** ${luck}\n\nClick the button below to roll for HP!`,
                components: [buttons],
                ephemeral: true,
            });
            return true;
        }

        // ---- Remove Character button ----
        if (customId === 'sl:remove') {
            if (!run) {
                await interaction.reply({ content: 'No active sublevel run in this channel!', ephemeral: true });
                return true;
            }
            if (run.characters.size === 0) {
                await interaction.reply({ content: 'No characters registered to remove!', ephemeral: true });
                return true;
            }

            const regId = nextRegId();
            const options = [...run.characters.keys()].slice(0, 25).map(name =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(name)
                    .setValue(name)
                    .setDescription('Remove from this run')
            );

            const dropdown = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`sl:removeoc:${regId}`)
                    .setPlaceholder('Choose a character to remove...')
                    .addOptions(options)
            );

            await interaction.reply({
                content: '### ➖ Remove a Character\nSelect a character to remove from this run:',
                components: [dropdown],
                ephemeral: true,
            });
            return true;
        }

        // ---- OC selected from register dropdown (legacy, kept for compat) ----
        if (customId.startsWith('sl:selectoc:')) {
            const parts = customId.split(':');
            const regId = parts[2];
            const reg = pendingRegistrations.get(regId);
            if (!reg) {
                await interaction.reply({ content: 'This registration has expired. Please try again.', ephemeral: true });
                return true;
            }

            const characterName = interaction.values[0];
            reg.characterName = characterName;

            // Auto-fetch luck
            try {
                const character = new Character(characterName);
                reg.luck = parseInt(character.currentStats.lck) || 0;
            } catch { reg.luck = 0; }

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel('Roll for HP (8d6)')
                    .setEmoji({ name: '🎲' })
                    .setCustomId(`sl:rollhp:${regId}`),
            );

            await interaction.update({
                content: `### 📋 Registering: **${characterName}**\n🍀 **Luck:** ${reg.luck}\n\nClick the button below to roll for HP!`,
                components: [buttons],
            });
            return true;
        }

        // ---- Remove OC dropdown ----
        if (customId.startsWith('sl:removeoc:')) {
            if (!run) {
                await interaction.reply({ content: 'No active run!', ephemeral: true });
                return true;
            }
            const characterName = interaction.values[0];
            run.characters.delete(characterName);

            await interaction.update({
                content: `✅ **${characterName}** has been removed from this run.`,
                components: [],
            });
            await updateTrackerPost(interaction.channel, run);            await persistActiveRuns();            return true;
        }

        // ---- Roll for HP button ----
        if (customId.startsWith('sl:rollhp:')) {
            const regId = customId.slice('sl:rollhp:'.length);
            const reg = pendingRegistrations.get(regId);
            if (!reg || !reg.characterName) {
                await interaction.reply({ content: 'Registration expired. Try again.', ephemeral: true });
                return true;
            }
            if (reg.hpRolled) {
                await interaction.reply({ content: 'HP has already been rolled!', ephemeral: true });
                return true;
            }

            reg.hpRolled = true;

            // Acknowledge and update ephemeral to "rolling" state (disables buttons)
            await interaction.deferUpdate();
            await interaction.editReply({
                content: `### 🎲 Rolling HP for **${reg.characterName}**...`,
                components: [],
            });

            // Send public animated message
            const numDice = 8;
            const sides = 6;
            const rolls = [];
            const diceEmoji = '🎲';

            const animMsg = await interaction.channel.send({
                components: [
                    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 🎲 Rolling HP for **${reg.characterName}**...\n${diceEmoji.repeat(numDice)}`
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2,
            });

            // Reveal each die one by one
            for (let i = 0; i < numDice; i++) {
                await new Promise(resolve => setTimeout(resolve, 800));
                const roll = rollDie(sides);
                rolls.push(roll);

                const revealed = rolls.map(r => `**\`${r}\``).join('** ');
                const remaining = diceEmoji.repeat(numDice - i - 1);

                await animMsg.edit({
                    components: [
                        new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### 🎲 Rolling HP for **${reg.characterName}**...\n${revealed}** ${remaining}`
                            )
                        )
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const totalHP = rolls.reduce((a, b) => a + b, 0);
            reg.hp = totalHP;
            reg.maxHp = totalHP;

            await new Promise(resolve => setTimeout(resolve, 500));

            // Final animated message
            await animMsg.edit({
                components: [
                    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### ❤️ HP Rolled for **${reg.characterName}**!\n${rolls.map(r => `**\`${r}\`**`).join(' ')} = **${totalHP} HP**`
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2,
            });

            // HP rolled — luck was already auto-fetched, finalize immediately
            await interaction.editReply({
                content: `### 📋 Registering: **${reg.characterName}**\n❤️ **HP:** ${totalHP}\n🍀 **Luck:** ${reg.luck}`,
                components: [],
            });

            await finalizeRegistration(interaction, reg, run);
            return true;
        }

    } catch (e) {
        console.error('Error in sublevel interaction handler:', e);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
        }
    }

    return true;
}

// ---- Finalize registration ----

async function finalizeRegistration(interaction, reg, run) {
    const effectiveRun = run || activeRuns.get(reg.channelId);
    if (!effectiveRun) return;

    // Add character to run
    effectiveRun.characters.set(reg.characterName, {
        hp: reg.hp,
        maxHp: reg.maxHp,
        luck: reg.luck,
        userId: reg.userId,
    });

    // Update tracker post
    await updateTrackerPost(interaction.channel, effectiveRun);
    await persistActiveRuns();

    // Send public registration announcement — compact single line
    const container = new ContainerBuilder().setAccentColor(11326574);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `✅ **${reg.characterName}** registered! — ❤️ ${reg.hp} HP | 🍀 ${reg.luck} LCK`
        ),
    );

    await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
    });

    // Update ephemeral to confirmed
    try {
        await interaction.editReply({
            content: `### ✅ **${reg.characterName}** has been registered!\n❤️ **HP:** ${reg.hp}  |  🍀 **Luck:** ${reg.luck}`,
            components: [],
        });
    } catch { /* ephemeral may have expired */ }

    // Clean up pending registration
    for (const [key, val] of pendingRegistrations) {
        if (val === reg) {
            pendingRegistrations.delete(key);
            break;
        }
    }
}

// ---- HP change (for /hp command) ----

/**
 * Apply HP change to a character in the active run.
 * Returns { oldHP, newHP, characterName } or { error }.
 */
export function applyHPChange(channelId, characterName, amount, type) {
    const run = activeRuns.get(channelId);
    if (!run) return { error: 'No active sublevel run in this channel.' };

    const charData = run.characters.get(characterName);
    if (!charData) return { error: `${characterName} is not registered in this run.` };

    const oldHP = charData.hp;
    if (type === 'heal') {
        charData.hp = Math.min(charData.hp + amount, charData.maxHp);
    } else {
        charData.hp -= amount;
    }

    const hitZero = charData.hp <= 0 && oldHP > 0;
    const revived = oldHP === 0 && type === 'heal' && charData.hp > 0;
    if (charData.hp < 0) charData.hp = 0;
    const newHP = charData.hp;

    // Persist asynchronously (fire-and-forget is fine here since caller awaits tracker update)
    persistActiveRuns().catch(e => console.error('Failed to persist active runs after HP change:', e));

    return { oldHP, newHP, characterName, hitZero, revived };
}
