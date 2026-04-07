import { Events } from 'discord.js';

export default {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;
        if (reaction.emoji.name !== '❌') return;

        // Handle partial reactions (uncached messages)
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (e) {
                console.error('Failed to fetch reaction:', e);
                return;
            }
        }

        const message = reaction.message;
        if (message.partial) {
            try {
                await message.fetch();
            } catch (e) {
                console.error('Failed to fetch message:', e);
                return;
            }
        }

        // Only delete messages sent by the bot itself
        if (message.author?.id !== message.client.user.id) return;

        try {
            await message.delete();
        } catch (e) {
            console.error('Failed to delete message on ❌ reaction:', e);
        }
    },
};
