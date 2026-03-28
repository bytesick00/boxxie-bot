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
import {
  getAllItemNames,
  Item,
  Mun,
} from "../utility/classes.js";
import { getBuyConfirmContainer, fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("Buy an item!")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Which item do you want to buy?")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("quantity")
      .setDescription("How many do you want to buy? Defaults to 1."),
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
      new TextDisplayBuilder().setContent("## Purchase Canceled! \uD83D\uDEAB"),
    ),
];

function getNotPurchasableComponent(itemName) {
  return [
    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**\`\`\`ERROR: ${itemName} is not available for purchase!\`\`\`**`,
      ),
    ),
  ];
}

function getScripErrorComponent(mun, amount) {
  return [
    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`**\`\`\`ERROR: Not enough scrip in ${mun.name}'s wallet, cannot remove ${amount} scrip!\`\`\`**
                                \uD83D\uDCB0 **BALANCE:** \`${mun.scrip}\` scrip`),
    ),
  ];
}

function getPurchasedComponent(itemName, quantity, newBalance) {
  const message =
    "## Purchased ([QUANTITY]x) [ITEM_NAME]! \uD83C\uDF89\n\uD83D\uDCB0 **NEW BALANCE**: [SCRIP]"
      .replace("[QUANTITY]", quantity)
      .replace("[ITEM_NAME]", itemName)
      .replace("[SCRIP]", newBalance);
  return [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message)),
  ];
}

async function mainFunction(interaction) {
  await interaction.deferReply();

  const itemName = interaction.options.getString("item");
  const quantity = interaction.options.getInteger("quantity") ?? 1;

  const item = new Item(itemName);

  // Block items with 0 or empty buy price
  if (!item.buyPrice || isNaN(item.buyPrice) || item.buyPrice <= 0) {
    await interaction.editReply({
      components: getNotPurchasableComponent(item.name),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const munID = interaction.user.id;
  const allMuns = getTableData("muns");
  const munName = allMuns.find((row) => row.id === munID).name;
  const mun = new Mun(munName);

  const components = getBuyConfirmContainer(
    item.name,
    quantity,
    item.buyPrice,
    mun.scrip,
    item.image,
  );

  const reply = await interaction.editReply({
    components: components,
    flags: MessageFlags.IsComponentsV2,
  });

  // Wait for confirm / cancel
  const collectorFilter = (i) => i.user.id === interaction.user.id;
  let componentResponse;
  try {
    try {
      componentResponse = await reply.awaitMessageComponent({
        filter: collectorFilter,
        time: 900_000,
      });
    } catch {
      componentResponse = await reply.resource.message.awaitMessageComponent({
        filter: collectorFilter,
        time: 900_000,
      });
    }
  } catch {
    return;
  }

  try {
    if (componentResponse.customId === "confirm") {
      try {
        await (await mun.inventory).buyItem(itemName, quantity);
        const newBalance = mun.scrip;
        await componentResponse.update({
          components: getPurchasedComponent(itemName, quantity, newBalance),
          flags: MessageFlags.IsComponentsV2,
          withResponse: false,
        });
      } catch (error) {
        if (error.message === "Not enough scrip!") {
          await componentResponse.update({
            components: getScripErrorComponent(mun, quantity),
            flags: MessageFlags.IsComponentsV2,
            withResponse: false,
          });
        } else {
          throw error;
        }
      }
    } else {
      await componentResponse.update({
        components: cancelComponent,
        flags: MessageFlags.IsComponentsV2,
        withResponse: false,
      });
    }
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
    const choices = getAllItemNames(null);
    const filtered = fuzzyMatchItems(choices, focusedValue);
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply('Usage: `!buy <item> [quantity]`');
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
    if (!item.buyPrice || isNaN(item.buyPrice) || item.buyPrice <= 0) {
      await message.reply(`**${item.name}** is not available for purchase!`);
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
    try {
      await (await mun.inventory).buyItem(itemName, quantity);
      const embed = basicEmbed(
        `Purchased (${quantity}x) ${item.name}! \uD83C\uDF89`,
        `\uD83D\uDCB0 **NEW BALANCE**: ${mun.scrip} scrip`,
        item.image || '', '', '', false
      );
      embed.setColor("#acd46e");
      await message.reply({ embeds: [embed] });
    } catch (error) {
      if (error.message === "Not enough scrip!") {
        await message.reply(`Not enough scrip! You have \`${mun.scrip}\` scrip but need \`${item.buyPrice * quantity}\`.`);
      } else {
        await message.reply(`Error: ${error.message}`);
      }
    }
  },
};
