import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import {
  simpleComponent,
  fuzzyMatchItems,
} from "../utility/components.js";
import { getData } from "../utility/access_data.js";
import { Inventory, Mun } from "../utility/classes.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("use")
  .setDescription("Use an item from your inventory!")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("The item to use")
      .setRequired(true)
      .setAutocomplete(true),
  );

async function mainFunction(interaction) {
  await interaction.deferReply();

  const munID = interaction.user.id;
  const munName = getData("muns", "id", munID).name;
  const mun = new Mun(munName);
  const inventory = await mun.inventory;

  const itemName = interaction.options.getString("item");
  const thisItem = inventory.getItem(itemName);

  if (thisItem === "Not in inventory!") {
    await interaction.editReply({
      components: simpleComponent("That item is not in your inventory! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (!thisItem.useText || thisItem.useText.trim() === '') {
    await interaction.editReply({
      components: simpleComponent("This item can't be used! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    const thumbnail = getData("shop", "name", itemName).image;
    const outcome = await inventory.useItem(itemName);
    let consumeText = "";
    if (outcome.consumed) {
      consumeText = `\n-# (1x) ${itemName} was consumed.`;
    } else {
      consumeText = `\n-# ♻️ This item is reusable; you did not lose it.`;
    }

    const message =
      `## Used ${itemName}!\n \>\>\> ${outcome.text}` + consumeText;
    await interaction.editReply({
      components: simpleComponent(message, thumbnail),
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {
    await interaction.editReply({
      components: simpleComponent("### Sorry! I ran into an error :("),
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
    const munID = interaction.user.id;
    const munName = getData("muns", "id", munID).name;

    const mun = new Mun(munName);
    const thisInventory = await mun.inventory;

    const choices = thisInventory.getAllItemNames().filter((name) => {
      const item = thisInventory.getItem(name);
      return item && item !== "Not in inventory!" && item.useText && item.useText.trim() !== '';
    });
    const focusedValue = interaction.options.getFocused();
    const filtered = fuzzyMatchItems(choices, focusedValue);
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply('Usage: `!use <item>`');
      return;
    }
    const itemName = args.trim();
    const munID = message.author.id;
    const munData = getData("muns", "id", munID);
    if (!munData) {
      await message.reply("Couldn't find your profile!");
      return;
    }
    const mun = new Mun(munData.name);
    const inventory = await mun.inventory;
    const thisItem = inventory.getItem(itemName);
    if (thisItem === "Not in inventory!") {
      await message.reply('That item is not in your inventory! \u274C');
      return;
    }
    if (!thisItem.useText || thisItem.useText.trim() === '') {
      await message.reply("This item can't be used! \u274C");
      return;
    }
    try {
      const outcome = await inventory.useItem(itemName);
      let consumeText = outcome.consumed
        ? `\n-# (1x) ${itemName} was consumed.`
        : `\n-# \u267B\uFE0F This item is reusable; you did not lose it.`;
      const embed = basicEmbed(`Used ${itemName}!`, `>>> ${outcome.text}${consumeText}`, thisItem.image || '');
      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply('Sorry! I ran into an error :(');
    }
  },
};
