import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
} from 'discord.js';
import { getTableData, getData, updateData, addInventoryRow } from './access_data.js';

// ---------------------------------------------------------------------------
// Action Store  –  keeps payloads for edit/post actions (keyed by short ID)
// ---------------------------------------------------------------------------

const actionStore = new Map();
const ACTION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup expired entries every 30 min
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of actionStore) {
        if (entry.expires < now) actionStore.delete(key);
    }
}, 30 * 60 * 1000).unref();

let counter = 0;
function nextId() {
    return `${Date.now().toString(36)}${(++counter).toString(36)}`;
}

function storeAction(payload) {
    const id = nextId();
    actionStore.set(id, { payload, expires: Date.now() + ACTION_TTL_MS });
    return id;
}

export function getStoredAction(id) {
    const entry = actionStore.get(id);
    if (!entry) return null;
    if (entry.expires < Date.now()) { actionStore.delete(id); return null; }
    return entry.payload;
}

// ---------------------------------------------------------------------------
// Style mapping
// ---------------------------------------------------------------------------

const STYLE_MAP = {
    primary:   ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success:   ButtonStyle.Success,
    danger:    ButtonStyle.Danger,
    link:      ButtonStyle.Link,
};

// ---------------------------------------------------------------------------
// Bracket-matching helper  (shared with embed parser)
// ---------------------------------------------------------------------------

function findMatchingBracket(text, openIdx) {
    if (text[openIdx] !== '[') return -1;
    let depth = 0;
    for (let i = openIdx; i < text.length; i++) {
        if (text[i] === '[') depth++;
        if (text[i] === ']') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

// ---------------------------------------------------------------------------
// Parse  $button[...]  and  $dropdown[...]  from command text
// ---------------------------------------------------------------------------

/**
 * Extracts component tags from command text.
 * Returns { cleanText, components } where components is an array of
 * ActionRowBuilder instances ready to attach to a message.
 *
 * BUTTON   $button[Label|style|action]         or  $button[Label|style|action|emoji]
 *   style  : primary / secondary / success / danger / link
 *   action : delete | edit:<content> | post:<content> | run:<commandName> | url:<link>
 *            secret:<content>  (1 person)  |  secret(N):<content>  |  secret(*):<content>
 *
 * DROPDOWN $dropdown[placeholder|Label=action|Label=action|...]
 */
export function parseComponents(text) {
    if (!text) return { cleanText: text || '', components: [] };

    const lower = text.toLowerCase();
    if (!lower.includes('$button[') && !lower.includes('$dropdown[')) {
        return { cleanText: text, components: [] };
    }

    const buttons = [];
    const dropdowns = [];
    const tagRanges = []; // [start, end] for removal

    // --- Buttons ---
    let searchFrom = 0;
    while (true) {
        const idx = lower.indexOf('$button[', searchFrom);
        if (idx === -1) break;
        const open = idx + '$button'.length;
        const close = findMatchingBracket(text, open);
        if (close === -1) { searchFrom = idx + 1; continue; }

        const inside = text.slice(open + 1, close);
        const parts = inside.split('|').map(s => s.trim());
        if (parts.length >= 3) {
            buttons.push({
                label: parts[0],
                style: parts[1].toLowerCase(),
                action: parts[2],
                emoji: parts[3] || null,
            });
        }
        tagRanges.push([idx, close + 1]);
        searchFrom = close + 1;
    }

    // --- Dropdowns ---
    searchFrom = 0;
    while (true) {
        const idx = lower.indexOf('$dropdown[', searchFrom);
        if (idx === -1) break;
        const open = idx + '$dropdown'.length;
        const close = findMatchingBracket(text, open);
        if (close === -1) { searchFrom = idx + 1; continue; }

        const inside = text.slice(open + 1, close);
        const parts = inside.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
            const placeholder = parts[0];
            const options = [];
            for (let i = 1; i < parts.length; i++) {
                const eqIdx = parts[i].indexOf('=');
                if (eqIdx === -1) continue;
                const label  = parts[i].slice(0, eqIdx).trim();
                const action = parts[i].slice(eqIdx + 1).trim();
                if (label && action) options.push({ label, action });
            }
            if (options.length > 0) dropdowns.push({ placeholder, options });
        }
        tagRanges.push([idx, close + 1]);
        searchFrom = close + 1;
    }

    // --- Strip tags from text (reverse order preserves indices) ---
    let cleanText = text;
    for (const [start, end] of tagRanges.sort((a, b) => b[0] - a[0])) {
        cleanText = cleanText.slice(0, start) + cleanText.slice(end);
    }
    cleanText = cleanText.trim();

    // --- Build Discord components ---
    const components = buildDiscordComponents(buttons, dropdowns);
    return { cleanText, components };
}

// ---------------------------------------------------------------------------
// Build Discord.js component rows
// ---------------------------------------------------------------------------

function buildCustomId(actionStr) {
    if (actionStr === 'delete') return 'cc:delete';
    const colonIdx = actionStr.indexOf(':');
    if (colonIdx === -1) return 'cc:delete';

    const type    = actionStr.slice(0, colonIdx).toLowerCase();
    const payload = actionStr.slice(colonIdx + 1);

    if (type === 'run') {
        const id = `cc:run:${payload}`;
        return id.length <= 100 ? id : `cc:run:${payload.slice(0, 93)}`;
    }
    if (type === 'edit' || type === 'post') {
        const storeId = storeAction({ type, content: payload });
        return `cc:${type}:${storeId}`;
    }
    if (type === 'secret') {
        const storeId = storeAction({ type: 'secret', content: payload, maxClaims: 1, claimedBy: [] });
        return `cc:secret:${storeId}`;
    }
    // secret(N) or secret(*) — limited or unlimited claims
    const secretMatch = type.match(/^secret\((\d+|\*)\)$/);
    if (secretMatch) {
        const max = secretMatch[1] === '*' ? Infinity : parseInt(secretMatch[1]);
        const storeId = storeAction({ type: 'secret', content: payload, maxClaims: max, claimedBy: [] });
        return `cc:secret:${storeId}`;
    }
    return 'cc:delete';
}

function buildDiscordComponents(buttons, dropdowns) {
    const rows = [];

    // Buttons — max 5 per ActionRow
    for (let i = 0; i < buttons.length; i += 5) {
        const chunk = buttons.slice(i, i + 5);
        const row = new ActionRowBuilder();
        for (const btn of chunk) {
            const builder = new ButtonBuilder().setLabel(btn.label);
            const style = STYLE_MAP[btn.style] || ButtonStyle.Secondary;
            builder.setStyle(style);
            if (btn.emoji) builder.setEmoji(btn.emoji);

            if (btn.style === 'link' && btn.action.toLowerCase().startsWith('url:')) {
                builder.setURL(btn.action.slice(4));
            } else {
                builder.setCustomId(buildCustomId(btn.action));
            }
            row.addComponents(builder);
        }
        rows.push(row);
    }

    // Dropdowns — one per ActionRow
    for (const dd of dropdowns) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`cc:menu:${nextId()}`)
            .setPlaceholder(dd.placeholder);

        for (const opt of dd.options) {
            const valueId = buildCustomId(opt.action);
            menu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(opt.label)
                    .setValue(valueId),
            );
        }
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    return rows;
}

// ---------------------------------------------------------------------------
// Interaction handler  –  call from interactionCreate
// ---------------------------------------------------------------------------

/**
 * Handles a button or select-menu interaction originating from a custom command.
 * Returns true if handled, false if the interaction isn't ours.
 */
export async function handleComponentInteraction(interaction) {
    const raw = interaction.isStringSelectMenu()
        ? interaction.values[0]    // the selected option value
        : interaction.customId;     // button customId

    if (!raw || !raw.startsWith('cc:')) return false;

    // For menu interactions, customId starts with cc:menu: — the action is in the value
    if (interaction.isStringSelectMenu() && !interaction.values[0]?.startsWith('cc:')) return false;

    // Handle secret buttons directly (need live store access for claim tracking)
    if (raw.startsWith('cc:secret:')) {
        try {
            await handleSecretButton(interaction, raw.slice('cc:secret:'.length));
        } catch (e) {
            console.error('Error handling secret button:', e);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
            }
        }
        return true;
    }

    const parsed = parseInteractionId(raw);
    if (!parsed) {
        await interaction.reply({ content: 'This action has expired.', ephemeral: true });
        return true;
    }

    try {
        switch (parsed.type) {
            case 'delete':
                await interaction.message.delete();
                break;

            case 'edit': {
                const result = resolveActionContent(parsed.content);
                await interaction.message.edit(result);
                await interaction.deferUpdate();
                break;
            }

            case 'post': {
                const result = resolveActionContent(parsed.content);
                await interaction.reply(result);
                break;
            }

            case 'run': {
                const output = await resolveCommandByName(parsed.commandName, interaction.user);
                if (!output) {
                    await interaction.reply({ content: 'That command was not found or has no output.', ephemeral: true });
                } else {
                    await interaction.reply(output);
                }
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown action.', ephemeral: true });
        }
    } catch (e) {
        console.error('Error handling custom command component:', e);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
        }
    }

    return true;
}

// ---------------------------------------------------------------------------
// Helpers for interaction handling
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Secret button handler
// ---------------------------------------------------------------------------

async function handleSecretButton(interaction, storeId) {
    const entry = actionStore.get(storeId);
    if (!entry || entry.expires < Date.now()) {
        if (entry) actionStore.delete(storeId);
        await interaction.reply({ content: 'This secret has expired.', ephemeral: true });
        return;
    }

    const payload = entry.payload;

    // Migrate old single-claimer payloads
    if (!Array.isArray(payload.claimedBy)) {
        const old = payload.claimedBy;
        const oldName = payload.claimedByName;
        payload.claimedBy = old ? [{ id: old, name: oldName }] : [];
        if (payload.maxClaims === undefined) payload.maxClaims = 1;
    }

    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const alreadyClaimed = payload.claimedBy.find(c => c.id === userId);

    // User already has a claim — let them re-read
    if (alreadyClaimed) {
        await interaction.reply({ content: payload.content, ephemeral: true });
        return;
    }

    // Check if there are slots left
    if (payload.claimedBy.length >= payload.maxClaims) {
        const names = payload.claimedBy.map(c => c.name).join(', ');
        await interaction.reply({
            content: `🔒 This secret has already been claimed by: ${names}`,
            ephemeral: true,
        });
        return;
    }

    // New claim
    payload.claimedBy.push({ id: userId, name: displayName });
    await interaction.reply({ content: payload.content, ephemeral: true });

    // Update button label on the original message
    try {
        const names = payload.claimedBy.map(c => c.name).join(', ');
        const slotsLeft = isFinite(payload.maxClaims)
            ? payload.maxClaims - payload.claimedBy.length
            : null;
        const suffix = slotsLeft !== null ? ` [${slotsLeft} left]` : '';
        const newLabel = `📜 Secret (${names})${suffix}`;
        // Discord button labels max 80 chars
        const label = newLabel.length <= 80 ? newLabel : newLabel.slice(0, 77) + '...';

        const newRows = rebuildButtonLabel(
            interaction.message.components,
            interaction.customId,
            label,
            ButtonStyle.Secondary,
        );
        await interaction.message.edit({ components: newRows });
    } catch (e) {
        console.error('Failed to update secret button:', e);
    }
}

/**
 * Rebuilds a message's component rows, replacing a specific button's label and style.
 */
function rebuildButtonLabel(existingRows, targetCustomId, newLabel, newStyle) {
    return existingRows.map(row => {
        const newRow = new ActionRowBuilder();
        for (const comp of row.components) {
            const data = comp.toJSON ? comp.toJSON() : comp;
            if (data.custom_id === targetCustomId) {
                newRow.addComponents(
                    ButtonBuilder.from(data).setLabel(newLabel).setStyle(newStyle)
                );
            } else {
                newRow.addComponents(data);
            }
        }
        return newRow;
    });
}

function parseInteractionId(id) {
    if (!id.startsWith('cc:')) return null;
    const rest = id.slice(3);

    if (rest === 'delete') return { type: 'delete' };

    if (rest.startsWith('run:')) {
        return { type: 'run', commandName: rest.slice(4) };
    }

    if (rest.startsWith('edit:')) {
        const storeId = rest.slice(5);
        const stored = getStoredAction(storeId);
        if (!stored) return null; // expired
        return { type: 'edit', content: stored.content };
    }

    if (rest.startsWith('post:')) {
        const storeId = rest.slice(5);
        const stored = getStoredAction(storeId);
        if (!stored) return null; // expired
        return { type: 'post', content: stored.content };
    }

    return null;
}

/**
 * Turns an action content string into a Discord send-options object.
 * Supports embed $tag[...] syntax (same as custom command text).
 */
function resolveActionContent(content) {
    if (!content) return { content: '...' };

    // Check for embed tags
    const hasEmbedTags = /\$(title|description|color|footer|thumbnail|image|author|url|timestamp|addfield)\[/i.test(content);
    if (hasEmbedTags) {
        const embed = parseEmbedFromText(content);
        const opts = { embeds: [embed], components: [] };
        const textMatch = content.match(/\$text\[([\s\S]*?)\]/i);
        if (textMatch) opts.content = textMatch[1];
        return opts;
    }

    // Check for new components in the edit/post content
    const { cleanText, components } = parseComponents(content);
    const opts = { content: cleanText || undefined, components };
    // Clear embeds if we're just doing text
    if (!hasEmbedTags) opts.embeds = [];
    return opts;
}

/**
 * Embed parser (mirrors the one in custom_commands.js).
 * Supports CCommandBot-compatible extended syntax:
 *   $title[text;url], $author[text;iconURL;hyperlink], $footer[text;iconURL],
 *   $addTimestamp[ms], $color[random/transparent/hex]
 */
function parseEmbedFromText(text) {
    const embed = new EmbedBuilder();
    const get = (tag) => {
        const m = text.match(new RegExp(`\\$${tag}\\[([\\s\\S]*?)\\]`, 'i'));
        return m ? m[1] : null;
    };

    // $title[text] or $title[text;url]
    const titleRaw = get('title');
    if (titleRaw) {
        const parts = titleRaw.split(';');
        embed.setTitle(parts[0]);
        if (parts[1] && parts[1].trim()) embed.setURL(parts[1].trim());
    }

    const desc  = get('description');  if (desc)  embed.setDescription(desc);

    const color = get('color');
    if (color) {
        try {
            if (color.toLowerCase() === 'random') embed.setColor('Random');
            else if (color.toLowerCase() === 'transparent') embed.setColor(0x2b2d31);
            else embed.setColor(color);
        } catch {}
    }

    // $footer[text] or $footer[text;iconURL]
    const footRaw = get('footer');
    if (footRaw) {
        const parts = footRaw.split(';');
        const footerObj = { text: parts[0] };
        if (parts[1] && parts[1].trim()) footerObj.iconURL = parts[1].trim();
        embed.setFooter(footerObj);
    }

    const thumb = get('thumbnail');    if (thumb) embed.setThumbnail(thumb);
    const img   = get('image');        if (img)   embed.setImage(img);

    // $author[text] or $author[text;iconURL] or $author[text;iconURL;hyperlink]
    const authRaw = get('author');
    if (authRaw) {
        const parts = authRaw.split(';');
        const authorObj = { name: parts[0] };
        if (parts[1] && parts[1].trim()) authorObj.iconURL = parts[1].trim();
        if (parts[2] && parts[2].trim()) authorObj.url = parts[2].trim();
        embed.setAuthor(authorObj);
    }

    // Standalone $url[...] (fallback if not set via $title)
    const url = get('url');
    if (url && titleRaw && !embed.data.url) embed.setURL(url);

    // $addTimestamp[ms] or $timestamp / $addTimestamp
    const tsMatch = text.match(/\$addTimestamp\[([\s\S]*?)\]/i);
    if (tsMatch) {
        const ms = parseInt(tsMatch[1]);
        embed.setTimestamp(!isNaN(ms) ? new Date(ms) : new Date());
    } else if (/\$(timestamp|addTimestamp)/i.test(text)) {
        embed.setTimestamp();
    }

    const fieldRe = /\$addField\[([\s\S]*?)\]/gi;
    let fm;
    while ((fm = fieldRe.exec(text)) !== null) {
        const parts = fm[1].split(';');
        embed.addFields({
            name:   parts[0] || '\u200b',
            value:  parts[1] || '\u200b',
            inline: parts[2] ? ['yes','true'].includes(parts[2].trim().toLowerCase()) : false,
        });
    }

    return embed;
}

// ---------------------------------------------------------------------------
// Resolve a custom command by name  (for run: action)
// Returns Discord send-options object or null.
// ---------------------------------------------------------------------------

async function resolveCommandByName(commandName, user) {
    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return null;

    const matches = allCommands.filter(cmd => {
        if (!cmd.command) return false;
        if (cmd.command.trim().toLowerCase() !== commandName.toLowerCase()) return false;
        if (cmd.limited && cmd.limited !== '' && parseInt(cmd.limited) <= 0) return false;
        return true;
    });
    if (matches.length === 0) return null;

    // Priority selection (same logic as custom_commands.js)
    const chosen = selectByPriority(matches);
    if (!chosen || !chosen.text) return null;

    // Decrement limited
    if (chosen.limited && chosen.limited !== '' && parseInt(chosen.limited) > 0) {
        const newLimit = parseInt(chosen.limited) - 1;
        const idx = allCommands.indexOf(chosen);
        if (idx !== -1) allCommands[idx].limited = String(newLimit);
        try {
            await updateData('prefixCommands', 'command', chosen.command, 'limited', String(newLimit));
        } catch { chosen.limited = String(newLimit); }
    }

    // Resolve variables
    let text = await resolveVars(chosen.text, allCommands);

    // Item / money rewards
    if (chosen.item && chosen.item.trim() !== '' && user) {
        const items = parseItemField(chosen.item);
        for (const { name, qty } of items) {
            await giveItemToUser(user.id, name, qty);
        }
    }
    if (chosen.money && chosen.money.trim() !== '' && user) {
        await giveMoneyToUser(user.id, parseMoneyValue(chosen.money.trim()));
    }

    // Build output
    if (chosen.embed && chosen.embed.toUpperCase() === 'TRUE') {
        // Strip component tags first, then parse embed
        const { cleanText: stripped, components } = parseComponents(text);
        const embed = parseEmbedFromText(stripped);
        const opts = { embeds: [embed] };
        const textMatch = stripped.match(/\$text\[([\s\S]*?)\]/i);
        if (textMatch) opts.content = textMatch[1];
        if (chosen.image) opts.files = [{ attachment: chosen.image }];
        if (components.length > 0) opts.components = components;
        return opts;
    }

    const { cleanText, components } = parseComponents(text);
    const opts = { content: cleanText };
    if (chosen.image && chosen.image.trim() !== '') opts.files = [{ attachment: chosen.image }];
    if (components.length > 0) opts.components = components;
    return opts;
}

function selectByPriority(commands) {
    const withPriority = commands.filter(c => c.priority && c.priority !== '' && parseInt(c.priority) > 0);
    if (withPriority.length > 0) {
        const max = Math.max(...withPriority.map(c => parseInt(c.priority)));
        const top = withPriority.filter(c => parseInt(c.priority) === max);
        return top[Math.floor(Math.random() * top.length)];
    }
    return commands[Math.floor(Math.random() * commands.length)];
}

async function resolveVars(text, allCommands, depth = 0) {
    if (depth > 10) return text;
    if (!text.includes('$')) return text;

    const skip = new Set(['title','description','text','color','footer','thumbnail',
        'image','author','url','timestamp','addtimestamp','addfield','editin','button','dropdown',
        'deletein','deletecommand','addreactions','attachment']);
    const re = /\$([A-Za-z][A-Za-z0-9_]*)/g;
    let m;
    const replacements = new Map();
    while ((m = re.exec(text)) !== null) {
        if (skip.has(m[1].toLowerCase()) || replacements.has(m[0])) continue;
        const vars = allCommands.filter(c =>
            c.command && c.command.trim().toLowerCase() === m[1].toLowerCase()
            && c.text && c.text.trim() !== ''
        );
        if (vars.length > 0) {
            replacements.set(m[0], vars[Math.floor(Math.random() * vars.length)].text);
        }
    }
    for (const [tok, val] of replacements) text = text.replace(tok, val);
    if (text.includes('$')) text = await resolveVars(text, allCommands, depth + 1);
    return text;
}

async function giveItemToUser(userId, itemName, quantity = 1) {
    try {
        const item = getData('shop', 'name', itemName);
        if (!item) return;
        const amt = item.amount !== undefined && item.amount !== '' ? parseInt(item.amount) : undefined;
        if (amt !== undefined && !isNaN(amt) && amt <= 0) return;
        const mun = getData('muns', 'id', userId);
        if (!mun) return;
        await addInventoryRow({ id: userId, mun: mun.name, item: item.name, amount: quantity, date: new Date().toUTCString() });
        if (amt !== undefined && !isNaN(amt) && amt > 0) {
            await updateData('shop', 'name', item.name, 'amount', String(amt - quantity));
        }
    } catch (e) { console.error('Error giving item from component action:', e); }
}

/**
 * Parses a money value that may be a range (e.g. "100-500") or a flat number.
 */
function parseMoneyValue(amount) {
    const str = String(amount).trim();
    const rangeMatch = str.match(/^(-?\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        if (isNaN(min) || isNaN(max) || min > max) return NaN;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return parseInt(str);
}

/**
 * Parses an item field: ||| for random selection, commas for multi-give.
 */
function parseItemEntry(entry) {
    const match = entry.trim().match(/^(.+?)\s+x(\d+)$/i);
    if (match) return { name: match[1].trim(), qty: parseInt(match[2]) };
    return { name: entry.trim(), qty: 1 };
}

function parseItemField(field) {
    const trimmed = field.trim();
    if (trimmed.includes('|||')) {
        const options = trimmed.split('|||').map(s => s.trim()).filter(Boolean);
        if (options.length === 0) return [];
        return [parseItemEntry(options[Math.floor(Math.random() * options.length)])];
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean).map(parseItemEntry);
}

async function giveMoneyToUser(userId, amount) {
    const num = typeof amount === 'number' ? amount : parseInt(amount);
    if (isNaN(num)) return;
    try {
        const mun = getData('muns', 'id', userId);
        if (!mun) return;
        const current = parseInt(mun.scrip) || 0;
        await updateData('muns', 'id', userId, 'scrip', String(current + num));
    } catch (e) { console.error('Error giving money from component action:', e); }
}
