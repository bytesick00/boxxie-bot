import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { getTableData, addInventoryRow } from "../utility/access_data.js";
import { Item, Mun } from "../utility/classes.js";
import { simpleComponent, fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("item")
  .setDescription("Look at an item's details!")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("The item to look at")
      .setRequired(true)
      .setAutocomplete(true),
  );

function buildItemInfoComponents(item, ownedQty) {
  const container = new ContainerBuilder().setAccentColor(11326574);

  const priceInfo = [];
  if (item.buyPrice && !isNaN(item.buyPrice) && item.buyPrice > 0)
    priceInfo.push(`**Buy Price:** \`${item.buyPrice} scrip\``);
  if (item.sellPrice && !isNaN(item.sellPrice) && item.sellPrice > 0)
    priceInfo.push(`**Sell Price:** \`${item.sellPrice} scrip\``);

  const infoTexts = [
    new TextDisplayBuilder().setContent(`## ${item.name}`),
    new TextDisplayBuilder().setContent(
      `**Type:** \`${item.type}\`` +
        (priceInfo.length > 0 ? "\n" + priceInfo.join("\n") : ""),
    ),
  ];

  if (item.description) {
    infoTexts.push(
      new TextDisplayBuilder().setContent(`> ${item.description}`),
    );
  }

  if (item.image) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(item.image))
        .addTextDisplayComponents(...infoTexts),
    );
  } else {
    container.addTextDisplayComponents(...infoTexts);
  }

  if (ownedQty > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `📦 **You own:** \`${ownedQty}\``,
      ),
    );
  }

  const components = [container];

  if (ownedQty > 0) {
    const buttons = [];

    if (item.useText && item.useText.trim() !== "") {
      buttons.push(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel("Use")
          .setEmoji({ name: "🧪" })
          .setCustomId("item:use"),
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("Destroy")
        .setEmoji({ name: "🗑️" })
        .setCustomId("item:destroy"),
    );

    if (item.giftable && item.giftable.toUpperCase() === "TRUE") {
      buttons.push(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel("Gift")
          .setEmoji({ name: "🎁" })
          .setCustomId("item:gift"),
      );
    }

    components.push(new ActionRowBuilder().addComponents(...buttons));
  }

  return components;
}

async function awaitComponent(reply, filter, time = 300_000) {
  try {
    return await reply.awaitMessageComponent({ filter, time });
  } catch {
    try {
      return await reply.resource.message.awaitMessageComponent({
        filter,
        time,
      });
    } catch {
      return null;
    }
  }
}

async function handleCollector(interaction, reply, item, inventory) {
  const collectorFilter = (i) => i.user.id === interaction.user.id;

  const response = await awaitComponent(reply, collectorFilter);
  if (!response) return;

  // ---- USE ----
  if (response.customId === "item:use") {
    try {
      const outcome = await inventory.useItem(item.name);
      const consumeText = outcome.consumed
        ? `\n-# (1x) ${item.name} was consumed.`
        : `\n-# ♻️ This item is reusable; you did not lose it.`;
      const message = `## Used ${item.name}!\n>>> ${outcome.text}${consumeText}`;
      await response.update({
        components: simpleComponent(message, item.image || ""),
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await response.update({
        components: simpleComponent("### Sorry! I ran into an error :("),
        flags: MessageFlags.IsComponentsV2,
      });
    }
    return;
  }

  // ---- DESTROY ----
  if (response.customId === "item:destroy") {
    try {
      await inventory.addItem(item.name, -1);
      await response.update({
        components: simpleComponent(
          `## 🗑️ Destroyed (1x) ${item.name}!`,
        ),
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await response.update({
        components: simpleComponent("### Sorry! I ran into an error :("),
        flags: MessageFlags.IsComponentsV2,
      });
    }
    return;
  }

  // ---- GIFT ----
  if (response.customId === "item:gift") {
    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("item:giftuser")
        .setPlaceholder("Select a user to gift to...")
        .setMinValues(1)
        .setMaxValues(1),
    );

    await response.update({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 🎁 Gift ${item.name}`,
            ),
            new TextDisplayBuilder().setContent(
              "Select who you want to gift this item to:",
            ),
          ),
        userSelect,
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const userResponse = await awaitComponent(reply, collectorFilter);
    if (!userResponse || userResponse.customId !== "item:giftuser") return;

    const targetUserId = userResponse.values[0];

    if (targetUserId === interaction.user.id) {
      await userResponse.update({
        components: simpleComponent("You can't gift an item to yourself! ❌"),
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const targetMunData = getTableData("muns").find(
      (row) => row.id === targetUserId,
    );
    if (!targetMunData) {
      await userResponse.update({
        components: simpleComponent(
          "That user doesn't have a profile! ❌",
        ),
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const targetUser = await interaction.client.users.fetch(targetUserId);
    try {
      await inventory.addItem(item.name, -1);
      const currentDate = new Date();
      await addInventoryRow({
        id: targetMunData.id,
        mun: targetMunData.name,
        item: item.name,
        amount: 1,
        date: currentDate.toUTCString(),
      });
      await userResponse.update({
        components: simpleComponent(
          `## 🎁 Gifted (1x) ${item.name} to ${targetUser.displayName}!`,
        ),
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await userResponse.update({
        components: simpleComponent("### Sorry! I ran into an error :("),
        flags: MessageFlags.IsComponentsV2,
      });
    }
    return;
  }
}

async function mainFunction(interaction) {
  await interaction.deferReply();

  const itemName = interaction.options.getString("item");
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
  let inventory = null;
  let ownedQty = 0;
  if (munData) {
    const mun = new Mun(munData.name);
    inventory = await mun.inventory;
    if (inventory.checkInventory(itemName)) {
      ownedQty = inventory.getItemQuantity(itemName);
    }
  }

  const components = buildItemInfoComponents(item, ownedQty);
  const reply = await interaction.editReply({
    components,
    flags: MessageFlags.IsComponentsV2,
  });

  if (ownedQty > 0 && inventory) {
    await handleCollector(interaction, reply, item, inventory);
  }
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const allItems = getTableData("shop")
      .map((row) => row.name)
      .filter(Boolean);
    const filtered = fuzzyMatchItems(allItems, focusedValue);
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply("Usage: `!item <item name>`");
      return;
    }
    const itemName = args.trim();
    let item;
    try {
      item = new Item(itemName);
    } catch {
      await message.reply("Item not found! ❌");
      return;
    }

    const munID = message.author.id;
    const munData = getTableData("muns").find((row) => row.id === munID);
    let ownedQty = 0;
    if (munData) {
      const mun = new Mun(munData.name);
      const inventory = await mun.inventory;
      if (inventory.checkInventory(itemName)) {
        ownedQty = inventory.getItemQuantity(itemName);
      }
    }

    const priceInfo = [];
    if (item.buyPrice && !isNaN(item.buyPrice) && item.buyPrice > 0)
      priceInfo.push(`**Buy:** ${item.buyPrice} scrip`);
    if (item.sellPrice && !isNaN(item.sellPrice) && item.sellPrice > 0)
      priceInfo.push(`**Sell:** ${item.sellPrice} scrip`);

    let description = `**Type:** ${item.type}`;
    if (priceInfo.length > 0) description += `\n${priceInfo.join(" | ")}`;
    if (item.description) description += `\n\n> ${item.description}`;
    if (ownedQty > 0) description += `\n\n📦 **You own:** ${ownedQty}`;

    const embed = basicEmbed(item.name, description, item.image || "");
    await message.reply({ embeds: [embed] });
  },
};
