import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { getTableData } from "../utility/access_data.js";
import {
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { Item, Mun } from "../utility/classes.js";
import { fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("sell")
  .setDescription("Sell an item from your inventory!")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Which item do you want to sell?")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("quantity")
      .setDescription("How many do you want to sell? Defaults to 1."),
  );

const errorComponent = [
  new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("### Sorry! I ran into an error :("),
    ),
];

const cancelComponent = [
  new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Sale Canceled! \uD83D\uDEAB"),
    ),
];

function getNotSellableComponent(itemName) {
  return [
    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**\`\`\`ERROR: ${itemName} cannot be sold!\`\`\`**`,
      ),
    ),
  ];
}

function getSellConfirmContainer(itemName, quantity, sellPrice, currentBalance, itemThumb) {
  const totalValue = sellPrice * quantity;
  const message1 = `Are you sure you want to sell (${quantity}x) **${itemName}** for **${totalValue} scrip**?`;
  const message2 = `> \uD83D\uDCB0 Your current scrip balance: \`${currentBalance}\``;

  const container = new ContainerBuilder().setAccentColor(11326574);
  const texts = [
    new TextDisplayBuilder().setContent("## Confirm Sale"),
    new TextDisplayBuilder().setContent(message1),
    new TextDisplayBuilder().setContent(message2),
  ];
  if (itemThumb) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
        .addTextDisplayComponents(...texts),
    );
  } else {
    container.addTextDisplayComponents(...texts);
  }

  return [
    container,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Yes")
        .setEmoji({ name: "\u2705" })
        .setCustomId("confirm"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("No")
        .setEmoji({ name: "\uD83D\uDEAB" })
        .setCustomId("cancel"),
    ),
  ];
}

function getSoldComponent(itemName, quantity, newBalance) {
  const message = `## Sold (${quantity}x) ${itemName}! \uD83D\uDCB0`;
  return [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# \uD83D\uDCB0 NEW BALANCE: ${newBalance}`)),
  ];
}

async function mainFunction(interaction) {
  await interaction.deferReply();

  const itemName = interaction.options.getString("item");
  const quantity = interaction.options.getInteger("quantity") ?? 1;

  const item = new Item(itemName);

  // Block items with 0 or empty sell price
  if (!item.sellPrice || isNaN(item.sellPrice) || item.sellPrice <= 0) {
    await interaction.editReply({
      components: getNotSellableComponent(item.name),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const munID = interaction.user.id;
  const allMuns = getTableData("muns");
  const munName = allMuns.find((row) => row.id === munID).name;
  const mun = new Mun(munName);
  const inventory = await mun.inventory;

  // Check the user actually has the item
  if (!inventory.checkInventory(itemName)) {
    await interaction.editReply({
      components: getNotSellableComponent(itemName + " (not in inventory)"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const ownedQty = inventory.getItemQuantity(itemName);
  if (ownedQty < quantity) {
    await interaction.editReply({
      components: getNotSellableComponent(itemName + ` (you only have ${ownedQty})`),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    // Remove item from inventory (negative quantity)
    await inventory.addItem(itemName, -quantity);
    // Add scrip
    const sellTotal = item.sellPrice * quantity;
    await mun.addScrip(sellTotal);
    await interaction.editReply({
      components: getSoldComponent(itemName, quantity, mun.scrip),
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {
    await interaction.editReply({
      components: errorComponent,
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    try {
      const munID = interaction.user.id;
      const munName = getTableData("muns").find((row) => row.id === munID).name;
      const mun = new Mun(munName);
      const inv = await mun.inventory;
      // Only show items that have a valid sell price
      const choices = inv.getAllItemNames().filter((name) => {
        const item = new Item(name);
        return item.sellPrice && !isNaN(item.sellPrice) && item.sellPrice > 0;
      });
      const filtered = fuzzyMatchItems(choices, focusedValue);
      await interaction.respond(
        filtered.map((choice) => ({ name: choice, value: choice })),
      );
    } catch {
      await interaction.respond([]);
    }
  },
    async executePrefix(message, args) {
        if (!args) {
            await message.reply('Usage: `!sell <item> [quantity]`');
            return;
        }
        const parts = args.trim().split(/\s+/);
        let quantity = 1;
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart) && parts.length > 1) {
            quantity = parseInt(lastPart);
            parts.pop();
        }
        const itemName = parts.join(' ');
        let item;
        try {
            item = new Item(itemName);
        } catch {
            await message.reply(`Item "${itemName}" not found.`);
            return;
        }
        if (!item.sellPrice || isNaN(item.sellPrice) || item.sellPrice <= 0) {
            await message.reply(`**${item.name}** cannot be sold!`);
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
        const inventory = await mun.inventory;
        if (!inventory.checkInventory(itemName)) {
            await message.reply(`You don't have **${itemName}** in your inventory!`);
            return;
        }
        const ownedQty = inventory.getItemQuantity(itemName);
        if (ownedQty < quantity) {
            await message.reply(`You only have ${ownedQty}x **${itemName}**.`);
            return;
        }
        await inventory.addItem(itemName, -quantity);
        const sellTotal = item.sellPrice * quantity;
        await mun.addScrip(sellTotal);
        const embed = basicEmbed(
            `Sold (${quantity}x) ${item.name}! \uD83D\uDCB0`,
            '',
            item.image || '', '', '', false
        );
        embed.setColor("#acd46e");
        embed.setFooter({ text: `💰 NEW BALANCE: ${mun.scrip} scrip` });
        await message.reply({ embeds: [embed] });
    },
};
