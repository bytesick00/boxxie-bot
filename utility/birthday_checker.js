import { getTableData } from './access_data.js';
import { basicEmbed } from './format_embed.js';

const BIRTHDAY_CHANNEL_ID = '1460425500097777694';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every hour

let lastCheckedDate = null;

/**
 * Get today's date as MM/DD string matching the birthday format in the OC data.
 */
function getTodayMMDD() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
}

/**
 * Check for character birthdays today and send a message to the notices channel.
 */
async function checkBirthdays(client) {
    const today = getTodayMMDD();

    // Only send once per calendar day
    if (lastCheckedDate === today) return;
    lastCheckedDate = today;

    const ocs = getTableData('ocs');
    if (!ocs) return;

    const birthdayCharacters = ocs.filter(oc => oc.birthday === today);
    if (birthdayCharacters.length === 0) return;

    const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.error(`[Birthday] Could not find channel ${BIRTHDAY_CHANNEL_ID}`);
        return;
    }

    for (const oc of birthdayCharacters) {
        const embed = basicEmbed(
            `🎂 Happy Birthday, ${oc.name}! 🎂`,
            `It's **${oc.name}**'s birthday today! (${oc.birthday})`,
            oc.image || ''
        );

        await channel.send({ embeds: [embed] }).catch(e =>
            console.error(`[Birthday] Failed to send birthday message for ${oc.name}:`, e)
        );
        console.log(`[Birthday] Sent birthday message for ${oc.name}`);
    }
}

/**
 * Start the birthday checker. Call once after the client is ready.
 */
export function startBirthdayChecker(client) {
    // Check immediately on startup
    checkBirthdays(client);

    // Then check every hour (will only send once per day due to lastCheckedDate guard)
    setInterval(() => {
        checkBirthdays(client).catch(e => console.error('[Birthday] Unhandled error:', e));
    }, CHECK_INTERVAL_MS);

    console.log('[Birthday] Birthday checker started.');
}
