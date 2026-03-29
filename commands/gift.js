import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { getTableData, addInventoryRow } from "../utility/access_data.js";
import { Item, Mun } from "../utility/classes.js";
import { simpleComponent, fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("gift")
  .setDescription("Gift an item to another player!")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("The item to gift")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Who to gift the item to")
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("quantity")
      .setDescription("How many to gift (defaults to 1)"),
  );

async function mainFunction(interaction) {
  await interaction.deferReply();

  const itemName = interaction.options.getString("item");
  const targetUser = interaction.options.getUser("user");
  const quantity = interaction.options.getInteger("quantity") ?? 1;

  if (quantity < 1) {
    await interaction.editReply({
      components: simpleComponent("Quantity must be at least 1! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (targetUser.id === interaction.user.id) {
    await interaction.editReply({
      components: simpleComponent(
        "You can't gift an item to yourself! ❌",
      ),
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

  if (!item.giftable || item.giftable.toUpperCase() !== "TRUE") {
    await interaction.editReply({
      components: simpleComponent(`**${item.name}** cannot be gifted! ❌`),
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

  const targetMunData = getTableData("muns").find(
    (row) => row.id === targetUser.id,
  );
  if (!targetMunData) {
    await interaction.editReply({
      components: simpleComponent(
        "That user doesn't have a profile! ❌",
      ),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    // Remove from sender
    await inventory.addItem(item.name, -quantity);
    // Add to recipient (no world amount decrement — it's a transfer)
    const currentDate = new Date();
    await addInventoryRow({
      id: targetMunData.id,
      mun: targetMunData.name,
      item: item.name,
      amount: quantity,
      date: currentDate.toUTCString(),
    });
    await interaction.editReply({
      components: simpleComponent(
        `## 🎁 Gifted (${quantity}x) ${item.name} to ${targetUser.displayName}!`,
        item.image || "",
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
      const choices = inv.getAllItemNames().filter((name) => {
        const item = new Item(name);
        return item.giftable && item.giftable.toUpperCase() === "TRUE";
      });
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
      await message.reply(
        "Usage: `!gift <@user> <item name> [quantity]`",
      );
      return;
    }

    const mentionMatch = args.match(/<@!?(\d+)>/);
    if (!mentionMatch) {
      await message.reply(
        "Please mention a user! Usage: `!gift <@user> <item name> [quantity]`",
      );
      return;
    }

    const targetUserId = mentionMatch[1];
    const argsWithoutMention = args.replace(/<@!?\d+>/, "").trim();
    const parts = argsWithoutMention.split(/\s+/);

    let quantity = 1;
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart) && parts.length > 1) {
      quantity = parseInt(lastPart);
      parts.pop();
    }

    const itemName = parts.join(" ");
    if (!itemName) {
      await message.reply(
        "Please specify an item! Usage: `!gift <@user> <item name> [quantity]`",
      );
      return;
    }

    if (targetUserId === message.author.id) {
      await message.reply("You can't gift to yourself!");
      return;
    }

    let item;
    try {
      item = new Item(itemName);
    } catch {
      await message.reply("Item not found! ❌");
      return;
    }

    if (!item.giftable || item.giftable.toUpperCase() !== "TRUE") {
      await message.reply(`**${item.name}** cannot be gifted!`);
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

    const targetMunData = getTableData("muns").find(
      (row) => row.id === targetUserId,
    );
    if (!targetMunData) {
      await message.reply("That user doesn't have a profile!");
      return;
    }

    await inventory.addItem(item.name, -quantity);
    const currentDate = new Date();
    await addInventoryRow({
      id: targetMunData.id,
      mun: targetMunData.name,
      item: item.name,
      amount: quantity,
      date: currentDate.toUTCString(),
    });

    const embed = basicEmbed(
      `🎁 Gifted (${quantity}x) ${item.name}!`,
      `Gifted to **${targetMunData.name}**`,
      item.image || "",
    );
    await message.reply({ embeds: [embed] });
  },
};
