import { Events, MessageFlags } from 'discord.js';
import { handleComponentInteraction } from '../utility/custom_command_components.js';
import { handleSublevelInteraction } from '../utility/sublevel_handler.js';

export default {
    name: Events.InteractionCreate,
	async execute(interaction) {
		// --- Custom command buttons & dropdowns ---
		// --- Modal submissions ---
		if (interaction.isModalSubmit()) {
			try {
				const handled = await handleSublevelInteraction(interaction);
				if (handled) return;
			} catch (e) {
				console.error('Error in sublevel modal handler:', e);
			}
			return;
		}

		if (interaction.isButton() || interaction.isStringSelectMenu()) {
			// Try forcereboot confirmation buttons
			if (interaction.isButton() && interaction.customId.startsWith('forcereboot:')) {
				try {
					const forcereboot = interaction.client.commands.get('forcereboot');
					if (forcereboot) await forcereboot.handleButton(interaction);
				} catch (e) {
					console.error('Error in forcereboot button handler:', e);
				}
				return;
			}
			// Try custom command handler (cc: prefix)
			try {
				const handled = await handleComponentInteraction(interaction);
				if (handled) return;
			} catch (e) {
				console.error('Error in custom command component handler:', e);
			}
			// Try sublevel handler (sl: prefix)
			try {
				const handled = await handleSublevelInteraction(interaction);
				if (handled) return;
			} catch (e) {
				console.error('Error in sublevel component handler:', e);
			}
			return;
		}

		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
			return;
		} 

		if (!interaction.isChatInputCommand()) return;
		
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						flags: MessageFlags.Ephemeral,
					});
				}
			} catch (replyError) {
				console.error('Failed to send error response:', replyError);
			}
		}
	},
}