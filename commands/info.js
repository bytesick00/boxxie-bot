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
import { Item, Award, AwardCase, Mun } from "../utility/classes.js";
import { simpleComponent, fuzzyMatchItems } from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Look at an item or award's details!")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("The item or award to look at")
      .setRequired(true)
      .setAutocomplete(true),
  );

// ── Resolve name to item or award ──

function resolveEntry(name) {
  // Try item first
  try {
    const item = new Item(name);
    return { kind: "item", entry: item };
  } catch {
    // not an item
  }
  // Try award
  try {
    const award = new Award(name);
    return { kind: "award", entry: award };
  } catch {
    // not an award either
  }
  return null;
}

// ── Item display (mirrors /item) ──

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
          .setCustomId("info:use"),
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("Destroy")
        .setEmoji({ name: "🗑️" })
        .setCustomId("info:destroy"),
    );

    if (item.giftable && item.giftable.toUpperCase() === "TRUE") {
      buttons.push(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel("Gift")
          .setEmoji({ name: "🎁" })
          .setCustomId("info:gift"),
      );
    }

    components.push(new ActionRowBuilder().addComponents(...buttons));
  }

  return components;
}

// ── Award holder count ──

function countAwardHolders(awardName) {
  const allRows = getTableData("awardRows") || [];
  const totals = new Map();
  for (const row of allRows) {
    if (row.award !== awardName) continue;
    const amt = parseInt(row.amount);
    if (isNaN(amt)) continue;
    totals.set(row.id, (totals.get(row.id) || 0) + amt);
  }
  let count = 0;
  for (const qty of totals.values()) {
    if (qty > 0) count++;
  }
  return count;
}

// ── Award display ──

function buildAwardInfoComponents(award, owned) {
  const container = new ContainerBuilder().setAccentColor(11326574);

  const infoTexts = [
    new TextDisplayBuilder().setContent(
      `## ${award.emoji || "🏆"} ${award.name}`,
    ),
    new TextDisplayBuilder().setContent(`**Category:** \`${award.type}\``),
  ];

  if (award.description) {
    infoTexts.push(
      new TextDisplayBuilder().setContent(`> ${award.description}`),
    );
  }

  if (award.image) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(award.image))
        .addTextDisplayComponents(...infoTexts),
    );
  } else {
    container.addTextDisplayComponents(...infoTexts);
  }

  const holderCount = countAwardHolders(award.name);

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small)
      .setDivider(true),
  );

  if (owned) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("🏆 **You have earned this award!**"),
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `👥 **${holderCount}** ${holderCount === 1 ? "person has" : "people have"} this award`,
    ),
  );

  return [container];
}

// ── Item interaction handler (use / destroy / gift) ──

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

async function handleItemCollector(interaction, reply, item, inventory) {
  const collectorFilter = (i) => i.user.id === interaction.user.id;

  const response = await awaitComponent(reply, collectorFilter);
  if (!response) return;

  // ---- USE ----
  if (response.customId === "info:use") {
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
  if (response.customId === "info:destroy") {
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
  if (response.customId === "info:gift") {
    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("info:giftuser")
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
    if (!userResponse || userResponse.customId !== "info:giftuser") return;

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

// ── Main function ──

async function mainFunction(interaction) {
  await interaction.deferReply();

  const name = interaction.options.getString("name");
  const resolved = resolveEntry(name);

  if (!resolved) {
    await interaction.editReply({
      components: simpleComponent("Item or award not found! ❌"),
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const munID = interaction.user.id;
  const munData = getTableData("muns").find((row) => row.id === munID);

  if (resolved.kind === "item") {
    const item = resolved.entry;
    let inventory = null;
    let ownedQty = 0;
    if (munData) {
      const mun = new Mun(munData.name);
      inventory = await mun.inventory;
      if (inventory.checkInventory(item.name)) {
        ownedQty = inventory.getItemQuantity(item.name);
      }
    }

    const components = buildItemInfoComponents(item, ownedQty);
    const reply = await interaction.editReply({
      components,
      flags: MessageFlags.IsComponentsV2,
    });

    if (ownedQty > 0 && inventory) {
      await handleItemCollector(interaction, reply, item, inventory);
    }
  } else {
    const award = resolved.entry;
    let owned = false;
    if (munData) {
      const mun = new Mun(munData.name);
      const awardCase = AwardCase.init(mun);
      owned = awardCase.hasAward(award.name);
    }

    const components = buildAwardInfoComponents(award, owned);
    await interaction.editReply({
      components,
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
    const allItems = getTableData("shop")
      .map((row) => row.name)
      .filter(Boolean);

    const filtered = fuzzyMatchItems(allItems, focusedValue);
    await interaction.respond(
      filtered.map((name) => ({ name, value: name })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply("Usage: `!info <item or award name>`");
      return;
    }
    const name = args.trim();
    const resolved = resolveEntry(name);

    if (!resolved) {
      await message.reply("Item or award not found! ❌");
      return;
    }

    const munID = message.author.id;
    const munData = getTableData("muns").find((row) => row.id === munID);

    if (resolved.kind === "item") {
      const item = resolved.entry;
      let ownedQty = 0;
      if (munData) {
        const mun = new Mun(munData.name);
        const inventory = await mun.inventory;
        if (inventory.checkInventory(item.name)) {
          ownedQty = inventory.getItemQuantity(item.name);
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
    } else {
      const award = resolved.entry;
      let owned = false;
      if (munData) {
        const mun = new Mun(munData.name);
        const awardCase = AwardCase.init(mun);
        owned = awardCase.hasAward(award.name);
      }

      const holderCount = countAwardHolders(award.name);
      const description =
        `**Category:** ${award.type}` +
        (award.description ? `\n\n> ${award.description}` : "") +
        (owned ? "\n\n🏆 **You have earned this award!**" : "") +
        `\n\n👥 **${holderCount}** ${holderCount === 1 ? "person has" : "people have"} this award`;

      const embed = basicEmbed(
        `${award.emoji || "🏆"} ${award.name}`,
        description,
        award.image || "",
      );
      await message.reply({ embeds: [embed] });
    }
  },
};
