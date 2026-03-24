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
import { Inventory, Item } from "./classes.js";
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

  const buyConfirmContainer = [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Confirm Purchase"),
            new TextDisplayBuilder().setContent(message1),
            new TextDisplayBuilder().setContent(message2),
          ),
      ),
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
  inventoryBool = false,
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
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Buy")
      .setEmoji({
        name: "💸",
      })
      .setCustomId("buy"),
  );

  const invButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Back to Inventory")
      .setEmoji({
        name: "💼",
      })
      .setCustomId("inventory"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Use Item")
      .setEmoji({
        name: "🫳",
      })
      .setCustomId("use"),
  );

  let buttonsToAdd;
  if (inventoryBool) {
    buttonsToAdd = invButtons;
  } else {
    buttonsToAdd = shopButtons;
  }

  const itemInfoComponents = [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(message1),
            new TextDisplayBuilder().setContent(message2),
            new TextDisplayBuilder().setContent(message3),
          ),
      ),
    buttonsToAdd,
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
export function getInventoryComponents(inventory) {
  const itemTemplate = "**`[ITEM_NAME][TAB_SPACE]`**📦**`QTY: [QTY]`**\n";
  let icItems = "";
  let oocItems = "";

  for (const item of inventory.items) {
    const charLimit = 30;
    let tabSpace = " ";
    if (item.item.length < charLimit) {
      tabSpace = " ".repeat(charLimit - item.item.length);
    }

    const thisItemRow = itemTemplate
      .replace("[ITEM_NAME]", item.item)
      .replace("[QTY]", item.quantity)
      .replace("[TAB_SPACE]", tabSpace);

    const itemData = getData("shop", "name", item.item);
    if (itemData.shop === "IC") {
      icItems = icItems + thisItemRow;
    } else {
      oocItems = oocItems + thisItemRow;
    }
  }

  if (icItems === "") {
    icItems = "None! 🫗";
  }

  if (oocItems === "") {
    oocItems = "None! 🫗";
  }

  const components = [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
              "https://64.media.tumblr.com/001a50cc48cfc6cda2e43a94150775c9/fdef8914977fe4e2-13/s1280x1920/7f20f4205ac63c95baeee7d8d497aa8e6e780d65.jpg",
            ),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${inventory.mun.name}'s Inventory`),
            new TextDisplayBuilder().setContent("**```IN CHARACTER ITEMS```**"),
            new TextDisplayBuilder().setContent(icItems),
          ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small)
          .setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**```OUT OF CHARACTER ITEMS```**"),
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(oocItems)),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel("Use an Item")
        .setEmoji({
          name: "🫳",
        })
        .setCustomId("use"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Get an Item's Info")
        .setEmoji({
          name: "🔍",
        })
        .setCustomId("info"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("Close Inventory")
        .setCustomId("close"),
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

  const confirmComponent = [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(itemThumb))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Use Item?"),
            new TextDisplayBuilder().setContent(message1),
            new TextDisplayBuilder().setContent(warningMessage),
          ),
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message2)),
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

export function getChooseItem(allItemNames) {
  const choices = [];
  for (const itemName of allItemNames) {
    const item = new Item(itemName);
    const itemDesc = `${item.shop} item | ${item.type}`;
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(item.name)
      .setValue(item.name)
      .setDescription(itemDesc);
    choices.push(option);
  }

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("useItem")
        .setPlaceholder("Choose an item")
        .addOptions(choices),
    ),
  ];
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
