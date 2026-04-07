import { EmbedBuilder } from 'discord.js';
import { getTableData, getData, updateData, addInventoryRow, writeCache } from './access_data.js';
import { parseComponents } from './custom_command_components.js';

const PREFIX = '?';

/**
 * Parses a money value that may be a range (e.g. "100-500") or a flat number.
 * Returns a resolved integer amount, or NaN if invalid.
 */
function parseMoneyValue(amount) {
    const trimmed = amount.trim();
    const rangeMatch = trimmed.match(/^(-?\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        if (isNaN(min) || isNaN(max) || min > max) return NaN;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return parseInt(trimmed);
}

/**
 * Parses an item field that may contain ||| for random selection
 * or commas for giving multiple items.
 * Returns an array of item names to give.
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

/**
 * Attempts to handle a prefix command from a message.
 * Returns true if a command was found and executed, false otherwise.
 */
export async function handlePrefixCommand(message) {
    const content = message.content.trim();
    if (!content.startsWith(PREFIX)) return false;

    const commandName = content.slice(PREFIX.length).trim().toLowerCase();
    if (!commandName) return false;
    if (commandName === 'boxxiemood') return false;

    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return false;

    // Find all matching commands (same name, still available if limited)
    const matches = allCommands.filter(cmd => {
        if (!cmd.command) return false;
        if (cmd.command.trim().toLowerCase() !== commandName) return false;
        // If limited, must have remaining uses > 0
        if (cmd.limited && cmd.limited !== '' && parseInt(cmd.limited) <= 0) return false;
        return true;
    });

    if (matches.length === 0) return false;

    // Select which command to run (priority + random)
    const chosen = selectByPriority(matches);
    if (!chosen || !chosen.text) return false;

    // Decrement limited uses if applicable
    if (chosen.limited && chosen.limited !== '' && parseInt(chosen.limited) > 0) {
        await decrementLimited(chosen, allCommands);
    }

    // Resolve variable substitutions ($OC, $costume, etc.)
    let text = await resolveVariables(chosen.text, allCommands, 0, { message });

    // Handle embed commands
    if (chosen.embed && chosen.embed.toUpperCase() === 'TRUE') {
        const editInData = parseEditIn(text);
        if (editInData) {
            const sendOptions = {};
            if (editInData.initialContent) sendOptions.content = editInData.initialContent;
            if (chosen.image) sendOptions.files = [{ attachment: chosen.image }];

            // Send initial message first, then edit to the embed after delay.
            const sent = await message.reply(Object.keys(sendOptions).length > 0 ? sendOptions : { content: '...' });
            await new Promise(resolve => setTimeout(resolve, editInData.delayMs));
            const editOptions = { content: '', embeds: [editInData.embed] };
            if (editInData.components && editInData.components.length > 0) {
                editOptions.components = editInData.components;
            }
            await sent.edit(editOptions);
            return sent;
        }

        // Extract component tags before building the embed
        const { cleanText: strippedText, components } = parseComponents(text);

        const { embed, meta } = parseEmbed(strippedText);
        const sendOptions = { embeds: [embed] };

        // $text[...] is sent as message content alongside the embed
        const textMatch = strippedText.match(/\$text\[([\s\S]*?)\]/i);
        if (textMatch) sendOptions.content = textMatch[1];

        if (chosen.image) sendOptions.files = [{ attachment: chosen.image }];
        if (meta.attachment) {
            if (!sendOptions.files) sendOptions.files = [];
            sendOptions.files.push({ attachment: meta.attachment.url, name: meta.attachment.name || undefined });
        }
        if (components.length > 0) sendOptions.components = components;

        // $deletecommand — delete the user's triggering message
        if (meta.deleteCommand) {
            message.delete().catch(() => {});
        }

        const sent = await message.reply(sendOptions);

        // $addReactions[emoji;emoji;...]
        if (meta.reactions.length > 0) {
            for (const emoji of meta.reactions) {
                sent.react(emoji).catch(() => {});
            }
        }

        // $deleteIn[time] — auto-delete bot reply after delay
        if (meta.deleteIn) {
            setTimeout(() => sent.delete().catch(() => {}), meta.deleteIn);
        }

        return sent;
    }

    // Handle item rewards
    if (chosen.item && chosen.item.trim() !== '') {
        const items = parseItemField(chosen.item);
        for (const { name, qty } of items) {
            await giveItem(message, name, qty);
        }
    }

    // Handle money rewards
    if (chosen.money && chosen.money.trim() !== '') {
        await giveMoney(message, chosen.money.trim());
    }

    // Parse component tags from text
    const { cleanText, components } = parseComponents(text);

    // Send the message
    const sendOptions = { content: cleanText };
    if (chosen.image && chosen.image.trim() !== '') {
        sendOptions.files = [{ attachment: chosen.image }];
    }
    if (components.length > 0) sendOptions.components = components;

    const sent = await message.reply(sendOptions);
    return sent;
}

/**
 * Selects a command from a list using the priority system.
 * Commands with the highest priority are preferred.
 * Among equal-priority commands, one is chosen randomly.
 */
function selectByPriority(commands) {
    const withPriority = commands.filter(cmd => cmd.priority && cmd.priority !== '' && parseInt(cmd.priority) > 0);

    if (withPriority.length > 0) {
        const maxPriority = Math.max(...withPriority.map(cmd => parseInt(cmd.priority)));
        const topTier = withPriority.filter(cmd => parseInt(cmd.priority) === maxPriority);
        return topTier[Math.floor(Math.random() * topTier.length)];
    }

    // No priority set — pick randomly from all
    return commands[Math.floor(Math.random() * commands.length)];
}

/**
 * Decrements the limited counter for a command.
 * Updates only the in-memory cache + lowdb (no sheet call).
 * The sheet is NOT updated here to avoid unnecessary API calls and
 * wrong-row issues when multiple commands share the same name.
 * Cached values are preserved across restarts by initCache().
 */
async function decrementLimited(command, allCommands) {
    const newLimit = parseInt(command.limited) - 1;
    command.limited = String(newLimit);
    await writeCache();
}

/**
 * Resolves $Variable substitutions in command text.
 * Variables reference other commands in the list whose command name matches
 * the variable name (case-insensitive). A random match is chosen.
 * 
 * e.g. "$OC + $costume" will replace $OC with a random "OC" command's text,
 *      and $costume with a random "costume" command's text.
 */
async function resolveVariables(text, allCommands, depth = 0, context = {}) {
    if (depth > 10) return text; // prevent infinite recursion
    if (!text.includes('$')) return text;

    // Find all $variable tokens (word characters after $)
    const variablePattern = /\$([A-Za-z][A-Za-z0-9_]*)/g;
    let match;
    const replacements = new Map();

    while ((match = variablePattern.exec(text)) !== null) {
        const varName = match[1];
        // Skip embed formatting tokens
        if (['title', 'description', 'text', 'color', 'footer', 'thumbnail', 'image', 'author', 'url', 'timestamp', 'addtimestamp', 'addfield', 'editin', 'button', 'dropdown', 'deletein', 'deletecommand', 'addreactions', 'attachment'].includes(varName.toLowerCase())) {
            continue;
        }

        if (replacements.has(match[0])) continue;

        // Find available commands matching this variable (same rules as top-level)
        const varCommands = allCommands.filter(cmd => {
            if (!cmd.command || !cmd.text || cmd.text.trim() === '') return false;
            if (cmd.command.trim().toLowerCase() !== varName.toLowerCase()) return false;
            if (cmd.limited && cmd.limited !== '' && parseInt(cmd.limited) <= 0) return false;
            return true;
        });

        if (varCommands.length > 0) {
            const picked = selectByPriority(varCommands);

            // Decrement limited if applicable
            if (picked.limited && picked.limited !== '' && parseInt(picked.limited) > 0) {
                await decrementLimited(picked, allCommands);
            }

            // Process item rewards
            if (picked.item && picked.item.trim() !== '') {
                const items = parseItemField(picked.item);
                if (context.message) {
                    for (const { name, qty } of items) await giveItem(context.message, name, qty);
                } else if (context.userId) {
                    for (const { name, qty } of items) await giveItemById(context.userId, name, qty);
                }
            }

            // Process money rewards
            if (picked.money && picked.money.trim() !== '') {
                if (context.message) {
                    await giveMoney(context.message, picked.money.trim());
                } else if (context.userId) {
                    await giveMoneyById(context.userId, picked.money.trim());
                }
            }

            replacements.set(match[0], picked.text);
        }
    }

    for (const [token, value] of replacements) {
        text = text.replace(token, value);
    }

    // Recurse in case substituted values contain more variables
    if (text.includes('$')) {
        text = await resolveVariables(text, allCommands, depth + 1, context);
    }

    return text;
}

/**
 * Parses a command text string with $tag[value] syntax into a Discord embed.
 * 
 * Supported tags (CCommandBot-compatible):
 *   $title[text;url], $description[...], $text[...], $color[hex/name/random],
 *   $footer[text;iconURL], $thumbnail[...], $image[...],
 *   $author[text;iconURL;hyperlink], $url[...],
 *   $timestamp / $addTimestamp / $addTimestamp[ms],
 *   $addField[name;value;inline(yes/no)],
 *   $attachment[url;name]
 *
 * Returns { embed, meta } where meta contains action directives:
 *   deleteIn, deleteCommand, reactions, attachment
 */
function parseEmbed(text) {
    const embed = new EmbedBuilder();
    const meta = { deleteIn: null, deleteCommand: false, reactions: [], attachment: null };

    const getTagValue = (tag) => {
        const regex = new RegExp(`\\$${tag}\\[([\\s\\S]*?)\\]`, 'i');
        const match = text.match(regex);
        return match ? match[1] : null;
    };

    // $title[text] or $title[text;url]
    const titleRaw = getTagValue('title');
    if (titleRaw) {
        const parts = titleRaw.split(';');
        embed.setTitle(parts[0]);
        if (parts[1] && parts[1].trim()) embed.setURL(parts[1].trim());
    }

    const description = getTagValue('description');
    if (description) embed.setDescription(description);

    const color = getTagValue('color');
    if (color) {
        try {
            if (color.toLowerCase() === 'random') embed.setColor('Random');
            else if (color.toLowerCase() === 'transparent') embed.setColor(0x2b2d31);
            else embed.setColor(color);
        } catch (e) { /* invalid color */ }
    }

    // $footer[text] or $footer[text;iconURL]
    const footerRaw = getTagValue('footer');
    if (footerRaw) {
        const parts = footerRaw.split(';');
        const footerObj = { text: parts[0] };
        if (parts[1] && parts[1].trim()) footerObj.iconURL = parts[1].trim();
        embed.setFooter(footerObj);
    }

    const thumbnail = getTagValue('thumbnail');
    if (thumbnail) embed.setThumbnail(thumbnail);

    const image = getTagValue('image');
    if (image) embed.setImage(image);

    // $author[text] or $author[text;iconURL] or $author[text;iconURL;hyperlink]
    const authorRaw = getTagValue('author');
    if (authorRaw) {
        const parts = authorRaw.split(';');
        const authorObj = { name: parts[0] };
        if (parts[1] && parts[1].trim()) authorObj.iconURL = parts[1].trim();
        if (parts[2] && parts[2].trim()) authorObj.url = parts[2].trim();
        embed.setAuthor(authorObj);
    }

    // Standalone $url[...] (fallback if not set via $title[text;url])
    const url = getTagValue('url');
    if (url && titleRaw && !embed.data.url) embed.setURL(url);

    // $timestamp / $addTimestamp / $addTimestamp[ms]
    const tsMatch = text.match(/\$addTimestamp\[([\s\S]*?)\]/i);
    if (tsMatch) {
        const ms = parseInt(tsMatch[1]);
        embed.setTimestamp(!isNaN(ms) ? new Date(ms) : new Date());
    } else if (/\$(timestamp|addTimestamp)/i.test(text)) {
        embed.setTimestamp();
    }

    // Handle $addField[name;value;inline]
    const addFieldRegex = /\$addField\[([\s\S]*?)\]/gi;
    let fieldMatch;
    while ((fieldMatch = addFieldRegex.exec(text)) !== null) {
        const parts = fieldMatch[1].split(';');
        const fieldName = parts[0] || '\u200b';
        const fieldValue = parts[1] || '\u200b';
        const inline = parts[2] ? ['yes', 'true'].includes(parts[2].trim().toLowerCase()) : false;
        embed.addFields({ name: fieldName, value: fieldValue, inline });
    }

    // --- Action meta-tags ---

    // $deleteIn[time]
    const deleteInRaw = getTagValue('deleteIn');
    if (deleteInRaw) meta.deleteIn = parseDelayMs(deleteInRaw);

    // $deletecommand
    if (/\$deletecommand/i.test(text)) meta.deleteCommand = true;

    // $addReactions[emoji;emoji;...]
    const reactionsRaw = getTagValue('addReactions');
    if (reactionsRaw) meta.reactions = reactionsRaw.split(';').map(e => e.trim()).filter(Boolean);

    // $attachment[url;name]
    const attachRaw = getTagValue('attachment');
    if (attachRaw) {
        const parts = attachRaw.split(';');
        meta.attachment = { url: parts[0].trim() };
        if (parts[1] && parts[1].trim()) meta.attachment.name = parts[1].trim();
    }

    return { embed, meta };
}

/**
 * Parses $editIn[<delay>;<block>] syntax used by custom commands.
 * Example:
 *   $description[GOING UP...]
 *   $editIn[1s;
 *   {title:THE ELEVATOR COMES TO A STOP...}
 *   {footer:Use !floorup or !floordown to continue when ready}
 *   {description:$floorupcontent}
 *   {color:#d9d5a2}
 *   ]
 */
function parseEditIn(text) {
    const startIdx = text.toLowerCase().indexOf('$editin[');
    if (startIdx === -1) return null;

    const openIdx = startIdx + '$editIn'.length;
    const closeIdx = findMatchingBracket(text, openIdx);
    if (closeIdx === -1) return null;

    const before = text.slice(0, startIdx);
    const initialMatch = before.match(/\$description\[([\s\S]*?)\]/i) || before.match(/\$text\[([\s\S]*?)\]/i);
    const initialContent = initialMatch ? initialMatch[1] : null;

    const inside = text.slice(openIdx + 1, closeIdx); // inside [...]
    const semicolonIdx = inside.indexOf(';');
    if (semicolonIdx === -1) return null;

    const delayToken = inside.slice(0, semicolonIdx).trim();
    const delayMs = parseDelayMs(delayToken);
    const block = inside.slice(semicolonIdx + 1);

    // Extract components ($button/$dropdown tags) from the block first
    const { cleanText: cleanBlock, components } = parseComponents(block);

    const fields = {};
    const fieldRegex = /\{(title|description|color|footer|thumbnail|image|author|url):([\s\S]*?)\}/gi;
    let match;
    while ((match = fieldRegex.exec(cleanBlock)) !== null) {
        fields[match[1].toLowerCase()] = match[2];
    }

    const embed = new EmbedBuilder();
    if (fields.title) embed.setTitle(fields.title);
    if (fields.description) embed.setDescription(fields.description);
    if (fields.color) {
        try { embed.setColor(fields.color); } catch (e) { /* invalid color */ }
    }
    if (fields.footer) embed.setFooter({ text: fields.footer });
    if (fields.thumbnail) embed.setThumbnail(fields.thumbnail);
    if (fields.image) embed.setImage(fields.image);
    if (fields.author) embed.setAuthor({ name: fields.author });
    if (fields.url && fields.title) embed.setURL(fields.url);

    return { delayMs, initialContent, embed, components };
}

function findMatchingBracket(text, openBracketIdx) {
    if (text[openBracketIdx] !== '[') return -1;
    let depth = 0;
    for (let i = openBracketIdx; i < text.length; i++) {
        if (text[i] === '[') depth++;
        if (text[i] === ']') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function parseDelayMs(token) {
    const t = token.toLowerCase();
    if (t.endsWith('ms')) {
        const n = parseInt(t.replace('ms', ''), 10);
        return Number.isNaN(n) ? 1000 : Math.max(0, n);
    }
    if (t.endsWith('s')) {
        const n = parseFloat(t.replace('s', ''));
        return Number.isNaN(n) ? 1000 : Math.max(0, Math.floor(n * 1000));
    }
    const n = parseInt(t, 10);
    return Number.isNaN(n) ? 1000 : Math.max(0, n);
}

/**
 * Gives an item to the message author.
 * Logs to inventory if item exists in the shop/items list.
 */
async function giveItem(message, itemName, quantity = 1) {
    try {
        const item = getData('shop', 'name', itemName);
        if (!item) return;

        // Check item world availability (amount column)
        const amt = item.amount !== undefined && item.amount !== '' ? parseInt(item.amount) : undefined;
        if (amt !== undefined && !isNaN(amt) && amt <= 0) return;

        const mun = getData('muns', 'id', message.author.id);
        if (!mun) return;

        await addInventoryRow({
            id: message.author.id,
            mun: mun.name,
            item: item.name,
            amount: quantity,
            date: new Date().toUTCString()
        });

        // Decrement world amount if limited
        if (amt !== undefined && !isNaN(amt) && amt > 0) {
            await updateData('shop', 'name', item.name, 'amount', String(amt - quantity));
        }
    } catch (e) {
        console.error('Error giving item from custom command:', e);
    }
}

/**
 * Awards money to the message author.
 */
async function giveMoney(message, amount) {
    const numAmount = parseMoneyValue(amount);
    if (isNaN(numAmount)) return;

    try {
        const mun = getData('muns', 'id', message.author.id);
        if (!mun) return;

        const currentScrip = parseInt(mun.scrip) || 0;
        await updateData('muns', 'id', message.author.id, 'scrip', String(currentScrip + numAmount));
    } catch (e) {
        console.error('Error giving money from custom command:', e);
    }
}

/**
 * Resolves a custom command by name and returns the reply payload (content, embeds, files, components).
 * Does NOT send anything — returns null if no command found, otherwise { ...sendOptions }.
 * Optionally handles rewards for a given userId.
 */
/**
 * Checks whether a custom command with the given name exists (has at least one available match).
 */
export function customCommandExists(commandName) {
    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return false;
    return allCommands.some(cmd => {
        if (!cmd.command) return false;
        if (cmd.command.trim().toLowerCase() !== commandName.toLowerCase()) return false;
        if (cmd.limited && cmd.limited !== '' && parseInt(cmd.limited) <= 0) return false;
        return true;
    });
}

export async function getCustomCommandContent(commandName, userId) {
    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return null;

    const matches = allCommands.filter(cmd => {
        if (!cmd.command) return false;
        if (cmd.command.trim().toLowerCase() !== commandName.toLowerCase()) return false;
        if (cmd.limited && cmd.limited !== '' && parseInt(cmd.limited) <= 0) return false;
        return true;
    });

    if (matches.length === 0) return null;

    const chosen = selectByPriority(matches);
    if (!chosen || !chosen.text) return null;

    // Decrement limited uses if applicable
    if (chosen.limited && chosen.limited !== '' && parseInt(chosen.limited) > 0) {
        await decrementLimited(chosen, allCommands);
    }

    let text = await resolveVariables(chosen.text, allCommands, 0, { userId });

    // Handle embed commands
    if (chosen.embed && chosen.embed.toUpperCase() === 'TRUE') {
        const editInData = parseEditIn(text);
        if (editInData) {
            return { editIn: editInData, image: chosen.image || null };
        }

        const { cleanText: strippedText, components } = parseComponents(text);
        const { embed, meta } = parseEmbed(strippedText);
        const sendOptions = { embeds: [embed] };

        const textMatch = strippedText.match(/\$text\[([\s\S]*?)\]/i);
        if (textMatch) sendOptions.content = textMatch[1];

        if (chosen.image) sendOptions.files = [{ attachment: chosen.image }];
        if (meta.attachment) {
            if (!sendOptions.files) sendOptions.files = [];
            sendOptions.files.push({ attachment: meta.attachment.url, name: meta.attachment.name || undefined });
        }
        if (components.length > 0) sendOptions.components = components;
        if (meta.deleteIn || meta.deleteCommand || meta.reactions.length > 0) {
            sendOptions._meta = meta;
        }
        return sendOptions;
    }

    // Handle item rewards
    if (chosen.item && chosen.item.trim() !== '' && userId) {
        const items = parseItemField(chosen.item);
        for (const { name, qty } of items) {
            await giveItemById(userId, name, qty);
        }
    }

    // Handle money rewards
    if (chosen.money && chosen.money.trim() !== '' && userId) {
        await giveMoneyById(userId, chosen.money.trim());
    }

    const { cleanText, components } = parseComponents(text);
    const sendOptions = { content: cleanText };
    if (chosen.image && chosen.image.trim() !== '') {
        sendOptions.files = [{ attachment: chosen.image }];
    }
    if (components.length > 0) sendOptions.components = components;
    return sendOptions;
}

/**
 * Gives an item to a user by their Discord ID (no message object needed).
 */
async function giveItemById(userId, itemName, quantity = 1) {
    try {
        const item = getData('shop', 'name', itemName);
        if (!item) return;
        const amt = item.amount !== undefined && item.amount !== '' ? parseInt(item.amount) : undefined;
        if (amt !== undefined && !isNaN(amt) && amt <= 0) return;
        const mun = getData('muns', 'id', userId);
        if (!mun) return;
        await addInventoryRow({
            id: userId,
            mun: mun.name,
            item: item.name,
            amount: quantity,
            date: new Date().toUTCString()
        });
        if (amt !== undefined && !isNaN(amt) && amt > 0) {
            await updateData('shop', 'name', item.name, 'amount', String(amt - quantity));
        }
    } catch (e) {
        console.error('Error giving item by ID:', e);
    }
}

/**
 * Awards money to a user by their Discord ID (no message object needed).
 */
async function giveMoneyById(userId, amount) {
    const numAmount = parseMoneyValue(amount);
    if (isNaN(numAmount)) return;
    try {
        const mun = getData('muns', 'id', userId);
        if (!mun) return;
        const currentScrip = parseInt(mun.scrip) || 0;
        await updateData('muns', 'id', userId, 'scrip', String(currentScrip + numAmount));
    } catch (e) {
        console.error('Error giving money by ID:', e);
    }
}

/**
 * Returns a list of unique custom command names (for a !commands listing).
 */
export function getCommandList() {
    const allCommands = getTableData('prefixCommands');
    if (!allCommands || !Array.isArray(allCommands)) return [];

    const names = new Map();
    for (const cmd of allCommands) {
        if (!cmd.command || cmd.command.trim() === '') continue;
        const name = cmd.command.trim().toLowerCase();
        names.set(name, (names.get(name) || 0) + 1);
    }

    return [...names.entries()].map(([name, count]) => ({
        name,
        count
    }));
}
