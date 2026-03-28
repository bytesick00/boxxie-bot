import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { getTableData } from "../utility/access_data.js";
import {
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import {
  getOpenGachas,
  getGachaItems,
  getFlavorText,
  Mun,
} from "../utility/classes.js";
import { getBuyConfirmContainer } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

let thisGachaName;
let thisNumPulls = 1;

const commandBuilder = new SlashCommandBuilder()
  .setName("gacha")
  .setDescription("Try your luck with a gacha!")
  .addSubcommand((option) =>
    option
      .setName("pull")
      .setDescription("Pull from a gacha!")
      .addStringOption((option) =>
        option
          .setName("gacha")
          .setDescription("Which gacha do you want to pull from?")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("pulls")
          .setDescription("How many pulls? Defaults to 1. Max 10.")
          .setMinValue(1)
          .setMaxValue(10),
      ),
  )
  .addSubcommand((option) =>
    option
      .setName("odds")
      .setDescription("View the drop rates for a gacha")
      .addStringOption((option) =>
        option
          .setName("gacha")
          .setDescription("Which gacha do you want to see odds for?")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  );

/**
 * Build a weighted pool from gacha items based on their Rarity value.
 * Each item gets `rarity` copies in the pool (default 1).
 */
function buildWeightedPool(items) {
  const pool = [];
  for (const item of items) {
    const rarity = parseInt(item.rarity) || 1;
    for (let i = 0; i < rarity; i++) {
      pool.push(item);
    }
  }
  return pool;
}

/**
 * Determine rarity tier based on item's drop percentage in the pool.
 */
function getRarityTier(item, pool) {
  const totalItems = pool.length;
  const rarity = parseInt(item.rarity) || 1;
  const percentage = (rarity / totalItems) * 100;

  if (percentage <= 5) return "legendary";
  if (percentage <= 15) return "rare";
  if (percentage <= 30) return "uncommon";
  return "common";
}

const rarityEmojis = {
  legendary: "🏆",
  rare: "🥇",
  uncommon: "🥈",
  common: "🥉",
};

function getGachaResultsComponent(gachaName, results, rarities) {
  const container = new ContainerBuilder().setAccentColor(11326574);

  if (results.length === 1) {
    const item = results[0];
    const emoji = rarityEmojis[rarities[0]] || "🥉";
    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🎰 You Won!`),
      )
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
              item.image ||
                "https://64.media.tumblr.com/4f5160222de5db25d0f4c1adc8877c6e/b8c9606df47e4fff-fc/s1280x1920/889020a9500cf7ee566904988a677381b23173cf.jpg",
            ),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${emoji} **${item.name}**`,
            ),
            new TextDisplayBuilder().setContent(
              `> ${item.description}`,
            ),
          ),
      );
  } else {
    // Multiple pulls - show summary
    const counts = {};
    const itemRarities = {};
    for (let i = 0; i < results.length; i++) {
      const name = results[i].name;
      counts[name] = (counts[name] || 0) + 1;
      if (!itemRarities[name]) {
        itemRarities[name] = rarities[i];
      }
    }

    const summary = Object.entries(counts)
      .map(([name, count]) => {
        const emoji = rarityEmojis[itemRarities[name]] || "🥉";
        return count > 1 ? `${emoji} **${name}** (x${count})` : `${emoji} **${name}**`;
      })
      .join("\n");

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🎰 You Won ${results.length} Items!`,
        ),
        new TextDisplayBuilder().setContent(summary),
      );

    // Show first item's image if available
    const firstImage = results.find((r) => r.image);
    if (firstImage && firstImage.image) {
      container.addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(firstImage.image),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`\u200b`),
          ),
      );
    }
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function getGachaOddsComponent(gachaName, gachaDesc, items) {
  const pool = buildWeightedPool(items);
  const totalPool = pool.length;

  const container = new ContainerBuilder().setAccentColor(11326574);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 🎰 ${gachaName} - Drop Rates`),
    new TextDisplayBuilder().setContent(`> ${gachaDesc}`),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small)
      .setDivider(true),
  );

  let oddsText = "";
  for (const item of items) {
    const count = pool.filter((p) => p.name === item.name).length;
    const percentage = ((count / totalPool) * 100).toFixed(1);
    const rarity = getRarityTier(item, pool);
    const emoji = rarityEmojis[rarity];
    oddsText += `${emoji} **${item.name}** — ${count}/${totalPool} (${percentage}%)\n`;
  }

  if (oddsText === "") {
    oddsText = "No items in this gacha!";
  } else if (oddsText.length > 4000) {
    oddsText = oddsText.slice(0, 3997) + "...";
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(oddsText),
  );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function getScripErrorComponent(mun, amount) {
  return [
    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`**\`\`\`ERROR: Not enough scrip in ${mun.name}'s wallet, cannot remove ${amount} scrip!\`\`\`**
                                💰 **BALANCE:** \`${mun.scrip}\` scrip`),
    ),
  ];
}

async function pullGacha(interaction, gachaName, numPulls) {
  const items = getGachaItems(gachaName);

  if (items.length === 0) {
    return interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### No items found in this gacha!",
            ),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // Check cost - use first item's buy price as the pull cost
  // Or use a flat gacha price if available
  const gachaInfo = getOpenGachas().find(
    (g) => g.name.toLowerCase() === gachaName.toLowerCase(),
  );
  if (!gachaInfo) {
    return interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### This gacha is not available!",
            ),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // Get mun info
  const munID = interaction.user.id;
  const allMuns = getTableData("muns");
  const munData = allMuns.find((row) => row.id === munID);
  if (!munData) {
    return interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### Could not find your profile!",
            ),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }
  const mun = new Mun(munData.name);

  // Charge gacha price upfront
  const pullPrice = parseInt(gachaInfo.gachaPrice) || 0;
  const totalCost = pullPrice * numPulls;

  if (totalCost > 0) {
    if (mun.scrip < totalCost) {
      return interaction.editReply({
        components: getScripErrorComponent(mun, totalCost),
        flags: MessageFlags.IsComponentsV2,
      });
    }
    await mun.removeScrip(totalCost);
  }

  // Build weighted pool and do pulls
  const pool = buildWeightedPool(items);
  const results = [];
  const resultRarities = [];

  for (let i = 0; i < numPulls; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const pulled = pool[randomIndex];
    results.push(pulled);
    resultRarities.push(getRarityTier(pulled, pool));
  }

  // Animated ticket reveal
  const ticketEmoji = '🎟️';

  // Show initial tickets
  await interaction.editReply({
    components: [
      new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🎰 ${gachaName}\n${ticketEmoji.repeat(numPulls)}`),
      ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });

  // Reveal each pull one by one
  for (let i = 0; i < numPulls; i++) {
    await new Promise(resolve => setTimeout(resolve, 800));

    const revealed = resultRarities.slice(0, i + 1)
      .map(r => rarityEmojis[r] || '🥉')
      .join('');
    const remaining = ticketEmoji.repeat(numPulls - i - 1);

    await interaction.editReply({
      components: [
        new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🎰 ${gachaName}\n${revealed}${remaining}`),
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // Small pause before showing full results
  await new Promise(resolve => setTimeout(resolve, 500));

  // Add items to inventory (scrip already charged above)
  const inventory = await mun.inventory;
  for (const pulled of results) {
    try {
      await inventory.addItem(pulled.name, 1);
    } catch (error) {
      if (error.message === "Item unavailable!" || error.message.includes("left in stock")) {
        return interaction.editReply({
          components: [
            new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**\`\`\`ERROR: ${error.message}\`\`\`**`),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }
      throw error;
    }
  }

  // Show results
  const payload = getGachaResultsComponent(gachaName, results, resultRarities);
  return interaction.editReply(payload);
}

async function mainFunction(interaction) {
  await interaction.deferReply();
  const choice = interaction.options.getSubcommand();

  switch (choice) {
    case "pull": {
      const gachaName = interaction.options.getString("gacha");
      const numPulls = interaction.options.getInteger("pulls") || 1;
      thisGachaName = gachaName;
      thisNumPulls = numPulls;

      await pullGacha(interaction, gachaName, numPulls);
      break;
    }
    case "odds": {
      const gachaName = interaction.options.getString("gacha");
      const gachaInfo = getOpenGachas().find(
        (g) => g.name.toLowerCase() === gachaName.toLowerCase(),
      );
      const items = getGachaItems(gachaName);
      const payload = getGachaOddsComponent(
        gachaName,
        gachaInfo?.description || "",
        items,
      );
      await interaction.editReply(payload);
      break;
    }
    default:
      break;
  }
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "gacha") {
      const openGachas = getOpenGachas();
      const focusedValue = focusedOption.value;
      let filtered = openGachas
        .map((g) => g.name)
        .filter((name) =>
          name.toLowerCase().startsWith(focusedValue.toLowerCase()),
        );
      if (filtered.length > 25) {
        filtered = filtered.slice(0, 25);
      }
      await interaction.respond(
        filtered.map((name) => ({ name: name, value: name })),
      );
    }
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply('Usage: `!gacha pull <name> [pulls]` or `!gacha odds <name>`');
      return;
    }
    const parts = args.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();
    if (subcommand === 'odds') {
      const gachaName = parts.slice(1).join(' ');
      const gachaInfo = getOpenGachas().find(g => g.name.toLowerCase() === gachaName.toLowerCase());
      if (!gachaInfo) {
        await message.reply('That gacha is not available!');
        return;
      }
      const items = getGachaItems(gachaName);
      const pool = buildWeightedPool(items);
      const totalPool = pool.length;
      let oddsText = '';
      for (const item of items) {
        const count = pool.filter(p => p.name === item.name).length;
        const percentage = ((count / totalPool) * 100).toFixed(1);
        const rarity = getRarityTier(item, pool);
        const emoji = rarityEmojis[rarity];
        oddsText += `${emoji} **${item.name}** \u2014 ${count}/${totalPool} (${percentage}%)\n`;
      }
      const embed = basicEmbed(`\uD83C\uDFB0 ${gachaName} - Drop Rates`, `> ${gachaInfo.description || ''}\n\n${oddsText || 'No items!'}`);
      await message.reply({ embeds: [embed] });
    } else if (subcommand === 'pull') {
      const remaining = parts.slice(1);
      let numPulls = 1;
      const lastPart = remaining[remaining.length - 1];
      if (/^\d+$/.test(lastPart) && remaining.length > 1) {
        numPulls = Math.min(Math.max(parseInt(lastPart), 1), 10);
        remaining.pop();
      }
      const gachaName = remaining.join(' ');
      const gachaInfo = getOpenGachas().find(g => g.name.toLowerCase() === gachaName.toLowerCase());
      if (!gachaInfo) {
        await message.reply('That gacha is not available!');
        return;
      }
      const items = getGachaItems(gachaName);
      if (items.length === 0) {
        await message.reply('No items found in this gacha!');
        return;
      }
      const munID = message.author.id;
      const allMuns = getTableData("muns");
      const munData = allMuns.find(row => row.id === munID);
      if (!munData) {
        await message.reply("Couldn't find your profile!");
        return;
      }
      const mun = new Mun(munData.name);
      const pullPrice = parseInt(gachaInfo.gachaPrice) || 0;
      const totalCost = pullPrice * numPulls;
      if (totalCost > 0 && mun.scrip < totalCost) {
        await message.reply(`Not enough scrip! You need \`${totalCost}\` but have \`${mun.scrip}\`.`);
        return;
      }
      if (totalCost > 0) await mun.removeScrip(totalCost);
      const pool = buildWeightedPool(items);
      const results = [];
      const resultRarities = [];
      for (let i = 0; i < numPulls; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const pulled = pool[randomIndex];
        results.push(pulled);
        resultRarities.push(getRarityTier(pulled, pool));
      }
      const inventory = await mun.inventory;
      for (const pulled of results) {
        try {
          await inventory.addItem(pulled.name, 1);
        } catch (error) {
          await message.reply(`Error: ${error.message}`);
          return;
        }
      }
      if (results.length === 1) {
        const item = results[0];
        const emoji = rarityEmojis[resultRarities[0]] || '\uD83E\uDD49';
        const embed = basicEmbed('\uD83C\uDFB0 You Won!', `${emoji} **${item.name}**\n> ${item.description || ''}`, item.image || '');
        await message.reply({ embeds: [embed] });
      } else {
        const counts = {};
        const itemRarities = {};
        for (let i = 0; i < results.length; i++) {
          const name = results[i].name;
          counts[name] = (counts[name] || 0) + 1;
          if (!itemRarities[name]) itemRarities[name] = resultRarities[i];
        }
        const summary = Object.entries(counts)
          .map(([name, count]) => {
            const emoji = rarityEmojis[itemRarities[name]] || '\uD83E\uDD49';
            return count > 1 ? `${emoji} **${name}** (x${count})` : `${emoji} **${name}**`;
          })
          .join('\n');
        const embed = basicEmbed(`\uD83C\uDFB0 You Won ${results.length} Items!`, summary);
        await message.reply({ embeds: [embed] });
      }
    } else {
      await message.reply('Usage: `!gacha pull <name> [pulls]` or `!gacha odds <name>`');
    }
  },
};
