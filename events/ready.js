import { Events, ActivityType } from 'discord.js';
import { getTableData } from '../utility/access_data.js';

export default {
    name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const allCommands = getTableData('prefixCommands');
		const moodEntries = allCommands?.filter(cmd => cmd.command?.trim().toLowerCase() === 'boxxiemood' && cmd.text);
		if (moodEntries?.length > 0) {
			const mood = moodEntries[Math.floor(Math.random() * moodEntries.length)];
			client.user.setActivity(mood.text.trim(), { type: ActivityType.Custom });
			console.log(`Bot status set: ${mood.text.trim()}`);
		}
	},
}