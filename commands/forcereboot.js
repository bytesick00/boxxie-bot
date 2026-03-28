import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { basicEmbed } from '../utility/format_embed.js';
import { hardReset } from '../utility/access_data.js';
import { activeRuns, persistActiveRuns } from '../utility/sublevel_handler.js';

// Track pending confirmations so only the original user can confirm
const pendingConfirms = new Set();

export default {
    data: new SlashCommandBuilder()
        .setName('forcereboot')
        .setDescription('Hard reset: wipes ALL cached data (including runs) and re-fetches from the spreadsheet.'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`forcereboot:confirm:${userId}`)
                .setLabel('Yes, reset everything')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`forcereboot:cancel:${userId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        );

        const embed = basicEmbed(
            '⚠️ Force Reboot',
            '**Are you sure you want to reset all cached data?**\n\n'
            + 'This will **delete all active sublevel runs** and any other local data, '
            + 'then re-fetch everything from the spreadsheet.\n\n'
            + '*Use `/refresh` for a soft refresh that keeps local data intact.*',
        );

        pendingConfirms.add(userId);
        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: [MessageFlags.Ephemeral],
        });
    },

    async handleButton(interaction) {
        const [, action, userId] = interaction.customId.split(':');

        if (interaction.user.id !== userId) {
            await interaction.reply({ content: 'This isn\'t your confirmation prompt.', ephemeral: true });
            return;
        }

        if (!pendingConfirms.has(userId)) {
            await interaction.reply({ content: 'This confirmation has already been used or expired.', ephemeral: true });
            return;
        }
        pendingConfirms.delete(userId);

        if (action === 'cancel') {
            await interaction.update({
                embeds: [basicEmbed('Cancelled', 'Force reboot cancelled. No data was changed.')],
                components: [],
            });
            return;
        }

        // Confirmed — do the hard reset
        await interaction.update({
            embeds: [basicEmbed('⏳ Resetting...', 'Wiping local data and re-fetching from the spreadsheet...')],
            components: [],
        });

        activeRuns.clear();
        await persistActiveRuns();
        await hardReset();

        await interaction.editReply({
            embeds: [basicEmbed('✅ Force Reboot Complete', 'All cached data has been wiped and re-fetched from the spreadsheet.')],
            components: [],
        });
    },

    async executePrefix(message) {
        await message.reply('Use the slash command `/forcereboot` for the confirmation prompt.');
    },
};
