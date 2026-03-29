import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { getTableData } from "../utility/access_data.js";
import { Item, Mun } from "../utility/classes.js";
import { simpleComponent, fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("destroy")
  .setDescription("Destroy items from your inventory.")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("The item to destroy")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("quantity")
      .setDescription("How many to destroy (defaults to 1)"),
  );

async function mainFunction(interaction) {
  await interaction.deferReply();

  const itemName = interaction.options.getString("item");
  const quantity = interaction.options.getInteger("quantity") ?? 1;

  if (quantity < 1) {
    await interaction.editReply({
      components: simpleComponent("Quantity must be at least 1! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  let item;
  try {
    item = new Item(itemName);
  } catch {
    await interaction.editReply({
      components: simpleComponent("Item not found! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const munID = interaction.user.id;
  const munData = getTableData("muns").find((row) => row.id === munID);
  if (!munData) {
    await interaction.editReply({
      components: simpleComponent("Couldn't find your profile! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const mun = new Mun(munData.name);
  const inventory = await mun.inventory;

  if (!inventory.checkInventory(itemName)) {
    await interaction.editReply({
      components: simpleComponent(
        "You don't have that item in your inventory! ❌",
      ),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const ownedQty = inventory.getItemQuantity(itemName);
  if (ownedQty < quantity) {
    await interaction.editReply({
      components: simpleComponent(
        `You only have ${ownedQty}x **${item.name}**! ❌`,
      ),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    await inventory.addItem(item.name, -quantity);
    await interaction.editReply({
      components: simpleComponent(
        `## 🗑️ Destroyed (${quantity}x) ${item.name}!`,
      ),
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
    const focusedValue = interaction.options.getFocused();
    try {
      const munID = interaction.user.id;
      const munData = getTableData("muns").find((row) => row.id === munID);
      if (!munData) {
        await interaction.respond([]);
        return;
      }
      const mun = new Mun(munData.name);
      const inv = await mun.inventory;
      const choices = inv.getAllItemNames();
      const filtered = fuzzyMatchItems(choices, focusedValue);
      await interaction.respond(
        filtered.map((c) => ({ name: c, value: c })),
      );
    } catch {
      await interaction.respond([]);
    }
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply("Usage: `!destroy <item name> [quantity]`");
      return;
    }

    const parts = args.trim().split(/\s+/);
    let quantity = 1;
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart) && parts.length > 1) {
      quantity = parseInt(lastPart);
      parts.pop();
    }
    const itemName = parts.join(" ");

    let item;
    try {
      item = new Item(itemName);
    } catch {
      await message.reply("Item not found! ❌");
      return;
    }

    const munData = getTableData("muns").find(
      (row) => row.id === message.author.id,
    );
    if (!munData) {
      await message.reply("Couldn't find your profile!");
      return;
    }

    const mun = new Mun(munData.name);
    const inventory = await mun.inventory;

    if (!inventory.checkInventory(itemName)) {
      await message.reply("You don't have that item!");
      return;
    }

    const ownedQty = inventory.getItemQuantity(itemName);
    if (ownedQty < quantity) {
      await message.reply(`You only have ${ownedQty}x **${item.name}**.`);
      return;
    }

    await inventory.addItem(item.name, -quantity);
    const embed = basicEmbed(
      `🗑️ Destroyed (${quantity}x) ${item.name}!`,
      `You now have ${Math.max(0, ownedQty - quantity)}x remaining.`,
      item.image || "",
    );
    await message.reply({ embeds: [embed] });
  },
};
