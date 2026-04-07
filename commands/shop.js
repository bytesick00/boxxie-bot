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
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import {
  getFlavorText,
  getOpenShops,
  Item,
  Mun,
} from "../utility/classes.js";
import {
  getItemInfoContainer,
  getBuyConfirmContainer,
  buildPaginatedItemSelect,
  buildCategoryFilterRow,
  fuzzyMatchItems,
} from "../utility/components.js";
import { basicEmbed } from "../utility/format_embed.js";

const ITEMS_PER_PAGE = 10;

const commandBuilder = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Browse the shop!")
  .addStringOption((option) =>
    option
      .setName("shop")
      .setDescription("Which shop do you want to browse?")
      .setRequired(true)
      .setAutocomplete(true),
  );

const CATEGORY_EMOJI = {
  Consumable: "💊",
  Collectable: "⭐",
  Equipment: "🛡️",
  Quest: "📜",
  Treasure: "💎",
  Usable: "🧪",
  Miscellaneous: "📦",
  "???": "❓",
};

function getShopCategories(shopType) {
  const shop = getTableData("shop").filter((item) => item.shop === shopType);
  const typeCounts = {};
  for (const item of shop) {
    const t = item.type || "???";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const categories = [{ label: "All", value: "ALL", count: shop.length, emoji: "🛒" }];
  for (const [t, count] of Object.entries(typeCounts)) {
    categories.push({ label: t, value: t, count, emoji: CATEGORY_EMOJI[t] || "❓" });
  }
  return categories;
}

function displayShop(pageNum, shopType, category = "ALL") {
  let shop = getTableData("shop").filter((item) => item.shop === shopType);
  if (category !== "ALL") {
    shop = shop.filter((item) => item.type === category);
  }

  const itemDesc = getFlavorText("Shop_Item");
  const shopDesc = getFlavorText("Shop_Desc");

  const shopDescContainer = new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## New Millennium Technologies Shop",
      ),
      new TextDisplayBuilder().setContent(shopDesc),
    );

  // Build category filter row
  const categories = getShopCategories(shopType);
  const categoryRow = buildCategoryFilterRow(categories, category);

  // Build paginated item select
  const allItems = shop.map((item) => ({
    label: item.name,
    value: item.name,
    description: `${item.buyPrice} scrip | ${item.type || "???"}`,
  }));

  const { selectRow, navRow, totalPages, pageItems, currentPage } =
    buildPaginatedItemSelect({
      items: allItems,
      page: pageNum,
      pageSize: ITEMS_PER_PAGE,
      selectId: "select_item",
      placeholder: "Select an item...",
    });

  // Build display text for current page items
  const shopItemsContainer = new ContainerBuilder().setAccentColor(11326574);

  const displayItems = shop.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  for (const item of displayItems) {
    const tabSpace = "[TAB_SPACE]";
    const standardLength = 20;

    let thisDesc = itemDesc
      .replace("[ITEM_NAME]", item.name)
      .replace("[ITEM_DESC]", item.description)
      .replace("[ITEM_PRICE]", item.buyPrice);

    const itemName = item.name;
    let spaceAmount = " ";
    if (itemName.length < standardLength) {
      spaceAmount = " ".repeat(standardLength - itemName.length);
    }
    thisDesc = thisDesc.replace(tabSpace, spaceAmount);

    shopItemsContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(thisDesc),
    );
  }

  if (displayItems.length === 0) {
    shopItemsContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No items in this category! 🫗"),
    );
  }

  shopItemsContainer
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(false),
    )
    .addActionRowComponents(selectRow);

  if (navRow) {
    shopItemsContainer.addActionRowComponents(navRow);
  }

  const components = [shopDescContainer];
  if (categoryRow) components.push(categoryRow);
  components.push(shopItemsContainer);

  return {
    components,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

function viewItem(itemName) {
  const item = new Item(itemName);

  const components = getItemInfoContainer(
    item.name,
    item.buyPrice,
    item.description,
    item.image,
    item.type,
  );
  return {
    components: components,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

const errorComponent = [
  new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("### Sorry! I ran into an error :("),
    ),
];

const timeoutComponent = [
  new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "### Shop closed! Use `/shop` to reopen. \uD83D\uDD12",
      ),
    ),
];

async function awaitComponent(reply, interaction) {
  const collectorFilter = (i) => i.user.id === interaction.user.id;
  try {
    return await reply.awaitMessageComponent({
      filter: collectorFilter,
      time: 900_000,
    });
  } catch {
    return await reply.resource.message.awaitMessageComponent({
      filter: collectorFilter,
      time: 900_000,
    });
  }
}

async function handleCollector(commandChoice, reply, interaction, ctx) {
  let componentResponse;
  try {
    componentResponse = await awaitComponent(reply, interaction);
  } catch {
    await interaction.editReply({
      components: timeoutComponent,
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    const response = componentResponse.customId;

    switch (commandChoice) {
      case "browse":
        if (response === "select_item") {
          const chosenItem = componentResponse.values[0];
          ctx.itemName = chosenItem;
          const newComp = viewItem(chosenItem);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("info", newResponse, interaction, ctx);
          return;
        }

        if (response === "page_next") {
          const shopItems = getTableData("shop").filter(
            (item) => item.shop === ctx.shopType,
          );
          const filtered = ctx.category === "ALL"
            ? shopItems
            : shopItems.filter((item) => item.type === ctx.category);
          const maxPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
          ctx.currentPage = Math.min(ctx.currentPage + 1, maxPages);
          const newComp = displayShop(ctx.currentPage, ctx.shopType, ctx.category);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("browse", newResponse, interaction, ctx);
        } else if (response === "page_back") {
          ctx.currentPage = Math.max(ctx.currentPage - 1, 1);
          const newComp = displayShop(ctx.currentPage, ctx.shopType, ctx.category);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("browse", newResponse, interaction, ctx);
        } else if (response === "cat_filter") {
          ctx.category = componentResponse.values[0];
          ctx.currentPage = 1;
          const newComp = displayShop(ctx.currentPage, ctx.shopType, ctx.category);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("browse", newResponse, interaction, ctx);
        } else {
          await interaction.deleteReply();
        }
        break;

      case "info":
        if (response === "shop") {
          const newComp = displayShop(ctx.currentPage, ctx.shopType, ctx.category);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("browse", newResponse, interaction, ctx);
        } else if (response === "buy_item") {
          const item = new Item(ctx.itemName);
          const munID = interaction.user.id;
          const allMuns = getTableData("muns");
          const munData = allMuns.find((row) => row.id === munID);
          const mun = new Mun(munData.name);
          const confirmComp = getBuyConfirmContainer(
            item.name,
            1,
            item.buyPrice,
            mun.scrip,
            item.image,
          );
          const confirmResponse = await componentResponse.update({
            components: confirmComp,
            flags: MessageFlags.IsComponentsV2,
          });
          await handleCollector("buy_confirm", confirmResponse, interaction, ctx);
        }
        break;

      case "buy_confirm":
        if (response === "confirm") {
          const item = new Item(ctx.itemName);
          const munID = interaction.user.id;
          const allMuns = getTableData("muns");
          const munData = allMuns.find((row) => row.id === munID);
          const mun = new Mun(munData.name);
          try {
            await (await mun.inventory).buyItem(ctx.itemName, 1);
            const purchasedComp = [
              new ContainerBuilder()
                .setAccentColor(11326574)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `## Purchased (1x) ${item.name}! 🎉`,
                  ),
                  new TextDisplayBuilder().setContent(
                    `-# 💰 NEW BALANCE: ${mun.scrip}`,
                  ),
                ),
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Primary)
                  .setLabel("Back to Shop")
                  .setEmoji({ name: "🛒" })
                  .setCustomId("shop"),
              ),
            ];
            const newResponse = await componentResponse.update({
              components: purchasedComp,
              flags: MessageFlags.IsComponentsV2,
            });
            await handleCollector("info", newResponse, interaction, ctx);
          } catch (error) {
            const errMsg = error.message === "Not enough scrip!"
              ? `**\`\`\`ERROR: Not enough scrip! Balance: ${mun.scrip}\`\`\`**`
              : "### Sorry! I ran into an error :(";
            const errComp = [
              new ContainerBuilder()
                .setAccentColor(11326574)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(errMsg),
                ),
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Primary)
                  .setLabel("Back to Shop")
                  .setEmoji({ name: "🛒" })
                  .setCustomId("shop"),
              ),
            ];
            const newResponse = await componentResponse.update({
              components: errComp,
              flags: MessageFlags.IsComponentsV2,
            });
            await handleCollector("info", newResponse, interaction, ctx);
          }
        } else if (response === "cancel") {
          const newComp = viewItem(ctx.itemName);
          const newResponse = await componentResponse.update(newComp);
          await handleCollector("info", newResponse, interaction, ctx);
        }
        break;

      default:
        break;
    }
  } catch {
    await interaction.editReply({
      components: errorComponent,
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

async function mainFunction(interaction) {
  await interaction.deferReply();

  const ctx = {
    currentPage: 1,
    shopType: interaction.options.getString("shop"),
    category: "ALL",
    itemName: null,
  };

  const payload = displayShop(ctx.currentPage, ctx.shopType, ctx.category);
  const reply = await interaction.editReply(payload);
  await handleCollector("browse", reply, interaction, ctx);
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async autocomplete(interaction) {
    const openShops = getOpenShops();
    const focusedValue = interaction.options.getFocused();
    const shopNames = openShops.map((s) => s.name);
    const filtered = fuzzyMatchItems(shopNames, focusedValue);
    await interaction.respond(
      filtered.map((name) => ({ name: name, value: name })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      const openShops = getOpenShops();
      if (openShops.length === 0) {
        await message.reply('No shops are currently open!');
        return;
      }
      const list = openShops.map(s => `\u2022 **${s.name}**${s.description ? ` \u2014 ${s.description}` : ''}`).join('\n');
      const embed = basicEmbed('\uD83C\uDFEA Available Shops', list);
      await message.reply({ embeds: [embed] });
      return;
    }
    const shopType = args.trim();
    const shopItems = getTableData("shop").filter(item =>
      item.shop?.toLowerCase() === shopType.toLowerCase()
    );
    if (shopItems.length === 0) {
      await message.reply(`No items found in shop "${shopType}".`);
      return;
    }
    const lines = shopItems.map(item => {
      const price = item.buyPrice || 'N/A';
      return `\u2022 **${item.name}** \u2014 \`${price} scrip\`\n  > ${item.description || 'No description.'}`;
    });
    const embed = basicEmbed(`\uD83C\uDFEA ${shopType}`, lines.join('\n'));
    await message.reply({ embeds: [embed] });
  },
};
