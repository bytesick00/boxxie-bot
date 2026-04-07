import {
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { StringSelectMenuBuilder } from "discord.js";
import { Inventory } from "./classes.js";
import { getData } from "./access_data.js";

/**
 * Description placeholder
 *
 * @export
 * @param {string} itemName
 * @param {string} itemQty
 * @param {string} itemPrice
 * @param {string} currentBalance
 * @returns {ContainerBuilder[]}
 */
export function getBuyConfirmContainer(
  itemName,
  itemQty,
  itemPrice,
  currentBalance,
  itemThumb,
) {
  let message1 =
    "Are you sure you want to buy ([QTY]x) **[ITEM_NAME]** for **[PRICE]**?";
  let message2 = "> 💰Your current scrip balance: `[BALANCE]`";

  message1 = message1
    .replace("[QTY]", itemQty)
    .replace("[ITEM_NAME]", itemName)
    .replace("[PRICE]", `${itemPrice} scrip`);
  message2 = message2.replace("[BALANCE]", currentBalance);

  const container = new ContainerBuilder().setAccentColor(11326574);
  const textComponents = [
    new TextDisplayBuilder().setContent("## Confirm Purchase"),
    new TextDisplayBuilder().setContent(message1),
    new TextDisplayBuilder().setContent(message2),
  ];
  if (itemThumb) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
        .addTextDisplayComponents(...textComponents),
    );
  } else {
    container.addTextDisplayComponents(...textComponents);
  }

  const buyConfirmContainer = [
    container,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Yes")
        .setEmoji({
          name: "✅",
        })
        .setCustomId("confirm"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("No")
        .setEmoji({
          name: "🚫",
        })
        .setCustomId("cancel"),
    ),
  ];

  return buyConfirmContainer;
}

/**
 * Description placeholder
 *
 * @export
 * @param {string} itemName
 * @param {string} itemPrice
 * @param {string} itemDesc
 * @param {string} itemThumb
 * @returns {ContainerBuilder[]}
 */
export function getItemInfoContainer(
  itemName,
  itemPrice,
  itemDesc,
  itemThumb,
  itemType,
) {
  const message1 = "## [ITEM_NAME]".replace("[ITEM_NAME]", itemName);
  const message2 = "**Price:** `[ITEM_PRICE] scrip`\n**Type:** `[ITEM_TYPE]`".replace(
    "[ITEM_PRICE]",
    itemPrice,
  ).replace('[ITEM_TYPE]', itemType);
  const message3 = "> [ITEM_DESC]".replace("[ITEM_DESC]", itemDesc);

  const shopButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Back to Shop")
      .setEmoji({
        name: "🛒",
      })
      .setCustomId("shop"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setLabel("Buy")
      .setEmoji({
        name: "💰",
      })
      .setCustomId("buy_item"),
  );

  const infoContainer = new ContainerBuilder().setAccentColor(11326574);
  const infoTexts = [
    new TextDisplayBuilder().setContent(message1),
    new TextDisplayBuilder().setContent(message2),
    new TextDisplayBuilder().setContent(message3),
  ];
  if (itemThumb) {
    infoContainer.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
        .addTextDisplayComponents(...infoTexts),
    );
  } else {
    infoContainer.addTextDisplayComponents(...infoTexts);
  }

  const itemInfoComponents = [
    infoContainer,
    shopButtons,
  ];

  return itemInfoComponents;
}

/**
 * Description placeholder
 *
 * @export
 * @param {Inventory} inventory
 * @returns {ContainerBuilder[]}
 */
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

const ITEMS_PER_PAGE = 20;

function getCategoryEmoji(type, shop) {
  if (shop === "OOC") return "🎁";
  return CATEGORY_EMOJI[type] || "❓";
}

function formatItemRow(name, quantity, emoji) {
  const charLimit = 30;
  let tabSpace = " ";
  if (name.length < charLimit) {
    tabSpace = " ".repeat(charLimit - name.length);
  }
  return `**\`${name}${tabSpace}\`**${emoji}**\`QTY: ${quantity}\`**`;
}

const CATEGORY_ORDER = ["Consumable", "Collectable", "Usable", "Equipment", "Quest", "Treasure", "Miscellaneous", "???", "OOC"];

function sortItems(items, sort) {
  switch (sort) {
    case "amount":
      return [...items].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    case "category":
      return [...items].sort((a, b) => {
        const catA = a.isOOC ? "OOC" : a.type;
        const catB = b.isOOC ? "OOC" : b.type;
        const diff = CATEGORY_ORDER.indexOf(catA) - CATEGORY_ORDER.indexOf(catB);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    default: // "alpha"
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function getInventoryComponents(inventory, filter = "ALL", page = 0, sort = "alpha") {
  // Build items with metadata
  const allItems = inventory.items.map((item) => {
    const itemData = getData("shop", "name", item.item);
    const type = itemData?.type || "???";
    const shop = itemData?.shop || "";
    return {
      name: item.item,
      quantity: item.quantity,
      type,
      shop,
      isOOC: shop === "OOC",
      emoji: getCategoryEmoji(type, shop),
    };
  });

  // Sort items
  const sortedItems = sortItems(allItems, sort);

  // Determine which categories the user owns
  const ownedTypes = new Set(sortedItems.map((i) => i.isOOC ? "OOC" : i.type));

  // Build filter dropdown: ALL + owned categories
  const allCategories = ["Consumable", "Collectable", "Usable", "Equipment", "Quest", "Treasure", "Miscellaneous", "???", "OOC"];
  const dropdownOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel("All")
      .setValue("ALL")
      .setDefault(filter === "ALL"),
  ];
  for (const cat of allCategories) {
    if (ownedTypes.has(cat)) {
      const label = cat === "OOC" ? "Out of Character" : cat;
      dropdownOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setValue(cat)
          .setDefault(filter === cat),
      );
    }
  }

  // Filter
  let filteredItems;
  if (filter === "ALL") {
    filteredItems = sortedItems;
  } else if (filter === "OOC") {
    filteredItems = sortedItems.filter((i) => i.isOOC);
  } else {
    filteredItems = sortedItems.filter((i) => !i.isOOC && i.type === filter);
  }

  // Pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = filteredItems.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE,
  );

  const pageLabel = `Page ${safePage + 1}/${totalPages} · ${totalItems} item${totalItems !== 1 ? "s" : ""}`;

  // Navigation buttons
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: "◀️" })
      .setCustomId("invPrev")
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel(pageLabel)
      .setCustomId("invPageInfo")
      .setDisabled(true),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: "▶️" })
      .setCustomId("invNext")
      .setDisabled(safePage >= totalPages - 1),
  );

  // Sort buttons
  const sortRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(sort === "alpha" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji({ name: "🔤" })
      .setCustomId("sortAlpha"),
    new ButtonBuilder()
      .setStyle(sort === "amount" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji({ name: "🔢" })
      .setCustomId("sortAmount"),
    new ButtonBuilder()
      .setStyle(sort === "category" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji({ name: "🏷️" })
      .setCustomId("sortCategory"),
  );

  const container = new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${inventory.mun.name}'s Inventory`,
      ),
    );

  if (filter === "ALL") {
    // Show IC / OOC split
    const icItems = pageItems.filter((i) => !i.isOOC);
    const oocItems = pageItems.filter((i) => i.isOOC);

    let icText = icItems.map((i) => formatItemRow(i.name, i.quantity, i.emoji)).join("\n");
    let oocText = oocItems.map((i) => formatItemRow(i.name, i.quantity, i.emoji)).join("\n");
    if (icText === "") icText = "None! 🫗";
    if (oocText === "") oocText = "None! 🫗";

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**```IN CHARACTER ITEMS```**"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(icText),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small)
          .setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**```OUT OF CHARACTER ITEMS```**"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(oocText),
      );
  } else {
    // Filtered to a single category — no header needed
    let itemsText = pageItems.map((i) => formatItemRow(i.name, i.quantity, i.emoji)).join("\n");
    if (itemsText === "") itemsText = "None! 🫗";
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(itemsText),
    );
  }

  const components = [
    container,
    navRow,
    sortRow,
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("inventoryCategory")
        .setPlaceholder("Filter by category")
        .addOptions(dropdownOptions),
    ),
  ];

  return components;
}

/**
 *
 * @param {string} itemName
 * @param {Inventory} inventory
 */
export function getConfirmUseComponents(
  itemName,
  itemThumb,
  consumable,
  quantity,
) {
  const consumableText =
    "⚠️ This item is **consumable**; its quantity will be reduced by 1.";
  const usableText =
    "♻️ This item is **reusable**; you will not lose it upon use.";

  let warningMessage;
  if (consumable) {
    warningMessage = consumableText;
  } else {
    warningMessage = usableText;
  }

  const message1 = "Are you sure you want to use **[ITEM_NAME]**?".replace(
    "[ITEM_NAME]",
    itemName,
  );
  const message2 = "> 📦**CURRENT QUANTITY:** [QTY]".replace("[QTY]", quantity);

  const useContainer = new ContainerBuilder().setAccentColor(11326574);
  const useTexts = [
    new TextDisplayBuilder().setContent("## Use Item?"),
    new TextDisplayBuilder().setContent(message1),
    new TextDisplayBuilder().setContent(warningMessage),
  ];
  if (itemThumb) {
    useContainer.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
        .addTextDisplayComponents(...useTexts),
    );
  } else {
    useContainer.addTextDisplayComponents(...useTexts);
  }
  useContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(message2));

  const confirmComponent = [
    useContainer,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Yes")
        .setEmoji({
          name: "✅",
        })
        .setCustomId("confirm"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("No")
        .setEmoji({
          name: "🚫",
        })
        .setCustomId("cancel"),
    ),
  ];

  return confirmComponent;
}

/**
 * Builds a paginated select menu for any list of items.
 * Handles collections beyond Discord's 25-option limit.
 *
 * @param {Object} options
 * @param {Array<{label: string, value: string, description?: string}>} options.items
 * @param {number} [options.page=1] Current page (1-indexed)
 * @param {number} [options.pageSize=25] Items per page (capped at 25)
 * @param {string} options.selectId Custom ID for the select menu
 * @param {string} [options.placeholder] Placeholder text
 * @returns {{ selectRow: ActionRowBuilder, navRow: ActionRowBuilder|null, totalPages: number, pageItems: Array, currentPage: number }}
 */
export function buildPaginatedItemSelect({
  items,
  page = 1,
  pageSize = 25,
  selectId,
  placeholder = "Select an item...",
}) {
  const effectivePageSize = Math.min(pageSize, 25);
  const totalPages = Math.max(1, Math.ceil(items.length / effectivePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const start = (safePage - 1) * effectivePageSize;
  const pageItems = items.slice(start, start + effectivePageSize);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(selectId)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1);

  if (pageItems.length > 0) {
    selectMenu.addOptions(
      pageItems.map((item) => {
        const opt = { label: item.label, value: item.value };
        if (item.description) opt.description = item.description.slice(0, 100);
        return opt;
      }),
    );
  }

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  let navRow = null;
  if (totalPages > 1) {
    navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("\u2039 Back")
        .setCustomId("page_back")
        .setDisabled(safePage === 1),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel(`${safePage}/${totalPages}`)
        .setCustomId("page_indicator")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Next \u203A")
        .setCustomId("page_next")
        .setDisabled(safePage === totalPages),
    );
  }

  return { selectRow, navRow, totalPages, pageItems, currentPage: safePage };
}

/**
 * Builds a dropdown select menu for category filtering.
 * @param {Array<{label: string, value: string, count?: number, emoji?: string}>} categories
 * @param {string} currentCategory
 * @returns {ActionRowBuilder|null}
 */
export function buildCategoryFilterRow(categories, currentCategory = "ALL") {
  if (categories.length <= 1) return null;

  const options = categories.slice(0, 25).map((cat) => {
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(cat.label)
      .setValue(cat.value)
      .setDefault(cat.value === currentCategory);
    if (cat.emoji) opt.setEmoji({ name: cat.emoji });
    if (cat.count != null) opt.setDescription(`${cat.count} item${cat.count !== 1 ? "s" : ""}`);
    return opt;
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("cat_filter")
      .setPlaceholder("Filter by category...")
      .addOptions(options),
  );
}

/**
 * Improved autocomplete matching: prefix matches first, then contains matches.
 * @param {string[]} choices
 * @param {string} query
 * @param {number} [limit=25]
 * @returns {string[]}
 */
export function fuzzyMatchItems(choices, query, limit = 25) {
  if (!query) return choices.slice(0, limit);
  const lower = query.toLowerCase();
  const prefixMatches = choices.filter((c) => c.toLowerCase().startsWith(lower));
  const containsMatches = choices.filter(
    (c) => !c.toLowerCase().startsWith(lower) && c.toLowerCase().includes(lower),
  );
  return [...prefixMatches, ...containsMatches].slice(0, limit);
}

export const errorComponent = [
  new ContainerBuilder()
    .setAccentColor(11326574)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("### Sorry! I ran into an error :("),
    ),
];

export function simpleComponent(message, thumbnail = "") {
  let output;
  if (thumbnail === "") {
    output = [new ContainerBuilder()
      .setAccentColor(11326574)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
    ];
  } else {
    output = [
      new ContainerBuilder()
      .setAccentColor(11326574)
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              message
            ),
          ),
      ),
    ];
  }

  return output;
}
