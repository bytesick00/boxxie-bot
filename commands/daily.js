import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { getTableData, getData, updateData, getTimeUntilNextSync } from "../utility/access_data.js";
import {
  Mun,
  Character,
  currentStats,
  getGachaItems,
} from "../utility/classes.js";
import {
  getCustomCommandContent,
  customCommandExists,
} from "../utility/custom_commands.js";

// Daily types that involve another character (PvP-flavored)
const PVP_DAILIES = new Set(["steal", "sabotage", "cooperate"]);

const commandBuilder = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Do your daily task for money!")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("What kind of daily do you want to do?")
      .setRequired(true)
      .addChoices(
        { name: "Work — Safe 5 scrip", value: "work" },
        { name: "Hustle — 2-10 scrip", value: "hustle" },
        { name: "Overtime — 8 scrip, risk exhaustion", value: "overtime" },
        { name: "Scavenge — Get scraps or win big", value: "scavenge" },
        { name: "Suck Up — Coin flip", value: "suckup" },
        { name: "Sabotage — -5 to +15 scrip (flavor from another OC)", value: "sabotage" },
        { name: "Steal — -10 to +25 scrip (flavor from another OC)", value: "steal" },
        { name: "Cooperate — You get -3 to +5 scrip, another OC gets +10 to +15", value: "cooperate" },
      ),
  );

/**
 * Picks a random OC from the full roster, returns a Character object.
 */
function getRandomOC() {
  const allOCs = getTableData("ocs");
  if (!allOCs || allOCs.length === 0) return null;
  const idx = Math.floor(Math.random() * allOCs.length);
  return new Character(allOCs[idx].name);
}

/**
 * Looks up the Discord user ID for a character's mun (player).
 */
function getMunIdForCharacter(character) {
  if (!character || !character.mun) return null;
  const munData = getData("muns", "name", character.mun);
  return munData ? munData.id : null;
}

/**
 * Formats a time-remaining string from milliseconds.
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Checks whether the user can use daily (not on cooldown, no consequence block).
 * Daily resets globally when the 24-hour periodic sync runs (clears all daily fields).
 * Returns { canUse: true } or { canUse: false, reason: string }
 */
function checkDailyAvailability(ocName) {
  const stats = new currentStats(ocName);

  // Check consequence (overtime exhaustion blocks daily)
  if (stats.dailyConsequence && stats.dailyConsequence.toLowerCase() === "exhausted") {
    const remaining = getTimeUntilNextSync();
    return {
      canUse: false,
      reason: remaining > 0
        ? `You're too exhausted from overtime to work today. Next reset in **${formatTimeRemaining(remaining)}**.`
        : "You're too exhausted from overtime to work today. Get some rest and try again after the next reset!",
    };
  }

  // Check if already used this cycle (field is cleared by periodic sync)
  if (stats.daily && stats.daily.trim() !== "") {
    const remaining = getTimeUntilNextSync();
    return {
      canUse: false,
      reason: remaining > 0
        ? `You've already done your daily! Next reset in **${formatTimeRemaining(remaining)}**.`
        : "You've already done your daily! It will reset on the next sync cycle.",
    };
  }

  return { canUse: true };
}

// ─── Daily reward calculators ───

function rollWork() {
  return { amount: 5, description: "You put in an honest day's work." };
}

function rollHustle() {
  // 2 to 10, EV = 6
  const amount = Math.floor(Math.random() * 9) + 2;
  return { amount, description: `You hustled and made **${amount}** scrip.` };
}

function rollSteal() {
  // -10 to +25, EV = 7.5
  const amount = Math.floor(Math.random() * 36) - 10;
  return { amount, description: amount >= 0
    ? `You got away with **${amount}** scrip!`
    : `You got caught! You were fined **${Math.abs(amount)}** scrip.` };
}

function rollScavenge() {
  // 80% → 1-3, 10% → 30, 10% → item from Trash gacha
  const roll = Math.random();
  if (roll < 0.8) {
    const amount = Math.floor(Math.random() * 3) + 1;
    return { amount, item: null, description: `You dug through the trash and found **${amount}** scrip.` };
  } else if (roll < 0.9) {
    return { amount: 30, item: null, description: "You found someone's lost wallet! **30** scrip!" };
  } else {
    // Item from Trash gacha pool
    const trashItems = getGachaItems("Trash");
    if (trashItems.length === 0) {
      return { amount: 1, item: null, description: "You dug through the trash but found nothing useful. **1** scrip for your trouble." };
    }
    // Use weighted pool like gacha
    const pool = [];
    for (const item of trashItems) {
      const rarity = parseInt(item.rarity) || 1;
      for (let i = 0; i < rarity; i++) pool.push(item);
    }
    const pulled = pool[Math.floor(Math.random() * pool.length)];
    return { amount: 0, item: pulled.name, description: `You found something in the trash: **${pulled.name}**!` };
  }
}

function rollSuckup() {
  // 50% → 0, 50% → 12. EV = 6
  const success = Math.random() < 0.5;
  return success
    ? { amount: 12, description: "The boss loved it! Bonus: **12** scrip." }
    : { amount: 0, description: "The boss saw right through you. **0** scrip today." };
}

function rollSabotage() {
  // -5 to +15, EV = 5
  const amount = Math.floor(Math.random() * 21) - 5;
  return { amount, description: amount >= 0
    ? `You got paid **${amount}** scrip by a rival department.`
    : `You got caught! You paid **${Math.abs(amount)}** scrip in damages.` };
}

function rollOvertime() {
  // 8 scrip, 20% chance of exhaustion (can't do daily tomorrow)
  const exhausted = Math.random() < 0.2;
  return {
    amount: 8,
    exhausted,
    description: exhausted
      ? "You made **8** scrip but passed out at your desk. You'll be too exhausted to work tomorrow."
      : "You put in the extra hours and earned **8** scrip.",
  };
}

function rollCooperate() {
  // 20% jackpot: both get +15
  const jackpot = Math.random() < 0.2;
  if (jackpot) {
    return {
      amount: 15,
      partnerAmount: 15,
      jackpot: true,
      description: "The synergy actually hits! You both get **15** scrip!",
    };
  }
  // Normal: player gets -3 to +5, partner gets 10-15
  const amount = Math.floor(Math.random() * 9) - 3;
  const partnerAmount = Math.floor(Math.random() * 6) + 10;
  return {
    amount,
    partnerAmount,
    jackpot: false,
    description: amount >= 0
      ? `You helped out and earned **${amount}** scrip for yourself.`
      : `You lost **${Math.abs(amount)}** scrip covering for them, but they made bank.`,
  };
}

/**
 * Tries to get flavor content from the custom command system.
 * Looks for a command named "daily_{type}" (e.g. "daily_work").
 * Returns the full result object from getCustomCommandContent
 * (which also processes Item, Money, Limited, Priority internally).
 */
async function getDailyFlavor(dailyType, userId) {
  const commandName = `daily_${dailyType}`;
  if (!customCommandExists(commandName)) return null;
  const result = await getCustomCommandContent(commandName, userId);
  return result || null;
}

/**
 * Gets the first OC belonging to a mun (player).
 */
function getFirstOCForMun(munName) {
  const allOCs = getTableData("ocs");
  if (!allOCs) return null;
  const oc = allOCs.find((o) => o.mun === munName);
  return oc ? oc.name : null;
}

const VALID_TYPES = new Set(["work", "hustle", "overtime", "scavenge", "suckup", "sabotage", "steal", "cooperate"]);

async function mainFunction(dailyType, userId, reply, ephemeralReply) {
  // Find the player's mun
  const allMuns = getTableData("muns");
  const munData = allMuns.find((row) => row.id === userId);
  if (!munData) {
    return reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### Could not find your profile!"),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const mun = new Mun(munData.name);

  // Find the player's first OC to track daily state
  const ocName = getFirstOCForMun(munData.name);
  if (!ocName) {
    return reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### You need at least one OC to use daily!"),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // Check daily availability
  const availability = checkDailyAvailability(ocName);
  if (!availability.canUse) {
    return (ephemeralReply || reply)({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ⏰ Daily Unavailable\n${availability.reason}`),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // Roll the daily
  let result;
  let targetOC = null;
  let targetMunId = null;

  switch (dailyType) {
    case "work":
      result = rollWork();
      break;
    case "hustle":
      result = rollHustle();
      break;
    case "steal":
      result = rollSteal();
      targetOC = getRandomOC();
      targetMunId = targetOC ? getMunIdForCharacter(targetOC) : null;
      break;
    case "scavenge":
      result = rollScavenge();
      break;
    case "suckup":
      result = rollSuckup();
      break;
    case "sabotage":
      result = rollSabotage();
      targetOC = getRandomOC();
      targetMunId = targetOC ? getMunIdForCharacter(targetOC) : null;
      break;
    case "overtime":
      result = rollOvertime();
      break;
    case "cooperate":
      result = rollCooperate();
      targetOC = getRandomOC();
      targetMunId = targetOC ? getMunIdForCharacter(targetOC) : null;
      break;
    default:
      result = rollWork();
  }

  // Give partner their scrip (cooperate)
  if (result.partnerAmount && targetOC) {
    const targetMunData = targetOC.mun ? getData("muns", "name", targetOC.mun) : null;
    if (targetMunData) {
      try {
        const partnerMun = new Mun(targetMunData.name);
        await partnerMun.addScrip(result.partnerAmount);
      } catch (e) {
        console.error("Daily cooperate: Failed to give partner scrip:", e);
      }
    }
  }

  // Apply money reward
  const amount = result.amount || 0;
  if (amount !== 0) {
    if (amount > 0) {
      await mun.addScrip(amount);
    } else {
      // Negative amount — try to remove, but don't go below 0
      const toRemove = Math.min(Math.abs(amount), mun.scrip);
      if (toRemove > 0) {
        await mun.removeScrip(toRemove);
      }
    }
  }

  // Apply item reward (scavenge)
  if (result.item) {
    try {
      const inventory = await mun.inventory;
      await inventory.addItem(result.item, 1);
    } catch (e) {
      console.error("Daily: Failed to give item:", e);
    }
  }

  // Mark daily as used (store timestamp)
  await updateData("currentStats", "name", ocName, "daily", String(Date.now()));

  // Apply consequence (overtime exhaustion)
  if (result.exhausted) {
    await updateData("currentStats", "name", ocName, "dailyConsequence", "exhausted");
  }

  // Build the response
  const container = new ContainerBuilder().setAccentColor(11326574);

  // Title
  const typeLabel = dailyType.charAt(0).toUpperCase() + dailyType.slice(1);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 📋 Daily: ${typeLabel}`),
  );

  // Flavor content from custom command (if available)
  // getCustomCommandContent already handles Priority, Limited, Item, Money internally
  let flavor = null;
  try {
    flavor = await getDailyFlavor(dailyType, userId);
  } catch (e) {
    // Flavor is optional
  }

  // Extract flavor text from the result
  let flavorText = null;
  let flavorEmbeds = null;
  let flavorFiles = null;
  if (flavor) {
    if (typeof flavor === "string") {
      flavorText = flavor;
    } else if (flavor.content) {
      flavorText = flavor.content;
    }
    if (flavor.embeds) flavorEmbeds = flavor.embeds;
    if (flavor.files) flavorFiles = flavor.files;
  }

  // For PvP dailies, add target info
  let pvpText = "";
  if (PVP_DAILIES.has(dailyType) && targetOC) {
    const targetTag = targetMunId ? ` (<@${targetMunId}>)` : "";
    if (dailyType === "steal") {
      pvpText = `You tried to steal from **${targetOC.name}**${targetTag}!\n`;
    } else if (dailyType === "sabotage") {
      pvpText = `You messed with **${targetOC.name}**'s workspace${targetTag}!\n`;
    } else if (dailyType === "cooperate") {
      pvpText = result.jackpot
        ? `You and **${targetOC.name}**${targetTag} hit a perfect synergy!\n`
        : `You got roped into helping **${targetOC.name}**${targetTag}.\n`;
    }
  }

  // Replace [OC] placeholder in flavor text with the target character name
  if (flavorText && targetOC) {
    flavorText = flavorText.replaceAll("[OC]", targetOC.name);
  }

  // Combine flavor text + PvP text + result
  let bodyText = "";
  if (flavorText) bodyText += `*${flavorText}*\n\n`;
  if (pvpText) bodyText += pvpText;
  bodyText += result.description;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(bodyText),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
  );

  // Footer — small text balance summary (matches buy/sell pattern)
  const updatedMun = new Mun(munData.name);
  let footerParts = [`-# 💰 NEW BALANCE: ${updatedMun.scrip}`];
  if (amount > 0) {
    footerParts[0] += ` (+${amount})`;
  } else if (amount < 0) {
    footerParts[0] += ` (${amount})`;
  }
  if (result.item) {
    footerParts.push(`-# 📦 Received: ${result.item}`);
  }
  if (result.exhausted) {
    footerParts.push(`-# 😴 Too exhausted to work tomorrow.`);
  }
  if (result.partnerAmount && targetOC) {
    footerParts.push(`-# 🤝 ${targetOC.name} received ${result.partnerAmount} scrip`);
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(footerParts.join("\n")),
  );

  const replyPayload = {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };

  // Attach flavor embeds and images from custom command
  if (flavorEmbeds) replyPayload.embeds = flavorEmbeds;
  if (flavorFiles) replyPayload.files = flavorFiles;

  return reply(replyPayload);
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    const dailyType = interaction.options.getString("type");
    const userId = interaction.user.id;
    let deferred = false;
    const reply = async (payload) => {
      if (!deferred) {
        await interaction.deferReply();
        deferred = true;
      }
      return interaction.editReply(payload);
    };
    const ephemeralReply = async (payload) => {
      return interaction.reply({
        ...payload,
        flags: (payload.flags || 0) | MessageFlags.Ephemeral,
      });
    };
    await mainFunction(dailyType, userId, reply, ephemeralReply);
  },
  async executePrefix(message, args) {
    const dailyType = args?.trim().split(/\s+/)[0]?.toLowerCase();
    if (!dailyType || !VALID_TYPES.has(dailyType)) {
      const typeList = [...VALID_TYPES].map(t => `\`${t}\``).join(", ");
      await message.reply(`Usage: \`?daily <type>\`\nTypes: ${typeList}`);
      return;
    }
    const userId = message.author.id;
    await mainFunction(dailyType, userId, (payload) => message.reply(payload));
  },
};
