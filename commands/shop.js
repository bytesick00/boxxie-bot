import {
  SlashCommandBuilder,
  CommandInteraction,
  ComponentBuilder,
  MessageFlags,
} from "discord.js";
import { getData, getTableData } from "../utility/access_data.js";
import {
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import {
  getAllItemNames,
  getFlavorText,
  Item,
  Mun,
} from "../utility/classes.js";
import {
  getBuyConfirmContainer,
  getItemInfoContainer,
} from "../utility/components.js";

let currentPage = 1;
let thisItemName;
let thisShopType;
let thisQuantity = 1;

const commandBuilder = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Interact with the shop!")
  .addSubcommand((option) =>
    option
      .setName("browse")
      .setDescription("Browse the whole shop!")
      .addStringOption((option) =>
        option
          .setName("which_shop")
          .setDescription("Browse the IC or OOC shop?")
          .setChoices([
            { name: "IC", value: "IC" },
            { name: "OOC", value: "OOC" },
          ])
          .setRequired(true),
      ),
  )
  .addSubcommand((option) =>
    option
      .setName("info")
      .setDescription("Quickly view an item")
      .addStringOption((option) =>
        option
          .setName("which_shop")
          .setDescription("IC or OOC shop item?")
          .setChoices([
            { name: "IC", value: "IC" },
            { name: "OOC", value: "OOC" },
          ])
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Which item do you want to view?")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((option) =>
    option
      .setName("buy")
      .setDescription("Quickly buy an item")
      .addStringOption((option) =>
        option
          .setName("which_shop")
          .setDescription("IC or OOC shop item?")
          .setChoices([
            { name: "IC", value: "IC" },
            { name: "OOC", value: "OOC" },
          ])
          .setRequired(true),
      )
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
      ),
  );



function displayShop(pageNum, shopType) {
  const shop = getTableData("shop").filter(item=> item.shop === shopType);
  const maxPages = Math.ceil(shop.length / 5);

  const itemDesc = getFlavorText("Shop_Item");
  const shopDesc = getFlavorText("Shop_Desc");
  const pageIndex = `Page ${pageNum} / ${maxPages}`;

  const shopDescContainer = new ContainerBuilder()
    .setAccentColor(11326574)
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            "https://64.media.tumblr.com/4f5160222de5db25d0f4c1adc8877c6e/b8c9606df47e4fff-fc/s1280x1920/889020a9500cf7ee566904988a677381b23173cf.jpg",
          ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## New Millennium Technologies Shop",
          ),
          new TextDisplayBuilder().setContent(shopDesc),
        ),
    );

  const shopItemsContainer = new ContainerBuilder().setAccentColor(11326574);

  const lowIndex = (pageNum - 1) * 5;
  let highIndex = lowIndex + 5;
  if (highIndex > shop.length) {
    highIndex = shop.length;
  }
  for (const item of shop.slice(lowIndex, highIndex)) {
    addItemToComponent(shopItemsContainer, item, itemDesc);
  }

  shopItemsContainer
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(false),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(pageIndex));

  const backButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel("‹ Back")
    .setCustomId("back");

  const nextButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel("Next ›")
    .setCustomId("next");

  const closeButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel("Exit Shop")
    .setCustomId("exit")
    .setStyle(ButtonStyle.Danger);

  if (pageNum === 1) {
    backButton.setDisabled(true);
  } else {
    backButton.setDisabled(false);
  }

  if (pageNum === maxPages) {
    nextButton.setDisabled(true);
  } else {
    nextButton.setDisabled(false);
  }

  const pageButtons = new ActionRowBuilder().addComponents([
    backButton,
    nextButton,
    closeButton,
  ]);

  return {
    components: [shopDescContainer, shopItemsContainer, pageButtons],
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

/**
 * Description placeholder
 *
 * @param {ContainerBuilder} component
 * @param {Item} item
 * @param {string} itemDesc
 */
function addItemToComponent(component, item, itemDesc) {
  const tabSpace = "[TAB_SPACE]";
  const standardLength = 20;

  let thisDesc = itemDesc
    .replace("[ITEM_NAME]", item.name)
    .replace("[ITEM_DESC]", item.description)
    .replace("[ITEM_PRICE]", item.buyPrice);

  const itemName = "[ITEM_NAME]".replace("[ITEM_NAME]", item.name);

  let spaceAmount = " ";
  if (itemName.length < standardLength) {
    spaceAmount = " ".repeat(standardLength - itemName.length);
  }

  thisDesc = thisDesc.replace(tabSpace, spaceAmount);

  const infoID = `info_${item.id}`;
  const buyID = `buy_${item.id}`;

  component
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(thisDesc))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("info")
          .setEmoji({
            name: "🔍",
          })
          .setCustomId(infoID),

        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("buy")
          .setEmoji({
            name: "💸",
          })
          .setCustomId(buyID),
      ),
    );
}

function buyItem(interaction, itemName, quantity) {
  thisItemName = itemName;

  if (quantity === null) {
    quantity = 1;
  }
  thisQuantity = quantity;

  const munID = interaction.user.id;
  const allMuns = getTableData("muns");
  const munName = allMuns.find((row) => row.id === munID).name;
  const mun = new Mun(munName);

  const item = new Item(itemName);

  const components = getBuyConfirmContainer(
    item.name,
    quantity,
    item.buyPrice,
    mun.scrip,
    item.image,
  );
  return {
    components: components,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

function viewItem(itemName) {
  thisItemName = itemName;
  const item = new Item(itemName);

  const components = getItemInfoContainer(
    item.name,
    item.buyPrice,
    item.description,
    item.image,
    item.type
  );
  return {
    components: components,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

async function mainFunction(interaction) {
  await interaction.deferReply();
  const choice = interaction.options.getSubcommand();
  let payload;

  switch (choice) {
    case "browse":
      const shopType = interaction.options.getString("which_shop")
      thisShopType = shopType;

      payload = displayShop(currentPage, shopType);
      break;
    case "buy":
      var itemName = interaction.options.getString("item");
      const quantity = interaction.options.getInteger("quantity");

      payload = buyItem(interaction, itemName, quantity);
      break;
    case "info":
      var itemName = interaction.options.getString("item");
      payload = viewItem(itemName);
      break;
    default:
      break;
  }

  const reply = await interaction.editReply(payload);

  await setCollectionFilter(choice, reply, interaction);
}

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
      new TextDisplayBuilder().setContent("## Purchase Canceled! 🚫"),
    ),
];

function getScripErrorComponent(mun, amount) {
  const poorComponent = [
    new ContainerBuilder().setAccentColor(11326574).addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`**\`\`\`ERROR: Not enough scrip in ${mun.name}'s wallet, cannot remove ${amount} scrip!\`\`\`**
                                💰 **BALANCE:** \`${mun.scrip}\` scrip`),
    ),
  ];
  return poorComponent;
}

function getPurchasedComponent(itemName, quantity, newBalance) {
  const message =
    "## Purchased ([QUANTITY]x) [ITEM_NAME]! 🎉\n💰 **NEW BALANCE**: [SCRIP]"
      .replace("[QUANTITY]", quantity)
      .replace("[ITEM_NAME]", itemName)
      .replace("[SCRIP]", newBalance);
  return [
    new ContainerBuilder()
      .setAccentColor(11326574)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message)),
  ];
}

async function setCollectionFilter(commandChoice, reply, interaction) {
  try {
    const collectorFilter = (i) => i.user.id === interaction.user.id;
    let componentResponse;

    try {
      componentResponse = await reply.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });
    } catch {
      componentResponse = await reply.resource.message.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });
    }

    const response = componentResponse.customId;

    switch (commandChoice) {
      case "browse":
        if (response.startsWith("info")) {
          const chosenItem = getData("shop", "id", response.slice(5)).name;
          const newComp = viewItem(chosenItem);
          const newResponse = await componentResponse.update(newComp);

          await setCollectionFilter("info", newResponse, interaction);
          return;
        }

        if (response.startsWith("buy")) {
          const chosenItem = getData("shop", "id", response.slice(4)).name;
          const newComp = buyItem(interaction, chosenItem, 1);
          const newResponse = await componentResponse.update(newComp);

          await setCollectionFilter("info", newResponse, interaction);
          return;
        }

        if (response === "next") {
          currentPage += 1;
          const newComp = displayShop(currentPage, thisShopType);
          const newResponse = await componentResponse.update(newComp);
          await setCollectionFilter("browse", newResponse, interaction);
        } else if (response === "back") {
          currentPage -= 1;
          const newComp = displayShop(currentPage, thisShopType);
          const newResponse = await componentResponse.update(newComp);
          await setCollectionFilter("browse", newResponse, interaction);
        } else {
          //exit everything
          await interaction.deleteReply();
        }

        break;
      case "info":
        if (response === "shop") {
          const newComp = displayShop(currentPage, thisShopType);
          const newResponse = await componentResponse.update(newComp);
          await setCollectionFilter("browse", newResponse, interaction);
        } else {
          const newComp = buyItem(interaction, thisItemName, 1);
          const newResponse = await componentResponse.update(newComp);
          await setCollectionFilter("buy", newResponse, interaction);
        }

        break;
      case "buy":
        if (response === "confirm") {
          const munID = interaction.user.id;
          const allMuns = getTableData("muns");
          const munName = allMuns.find((row) => row.id === munID).name;
          const mun = new Mun(munName);

          try {
            (await mun.inventory).buyItem(thisItemName, thisQuantity);
            const newBalance = mun.scrip;
            const comp = getPurchasedComponent(
              thisItemName,
              thisQuantity,
              newBalance,
            );
            await componentResponse.update({
              components: comp,
              flags: MessageFlags.IsComponentsV2,
              withResponse: false,
            });
          } catch (error) {
            if (error.message === "Not enough scrip!") {
              const scripErrorComp = getScripErrorComponent(mun, thisQuantity);
              await componentResponse.update({
                components: scripErrorComp,
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
        break;

      default:
        break;
    }
  } catch {
    await interaction.editReply({ components: errorComponent });
  }
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async autocomplete(interaction) {
    let shopType = interaction.options.getString("which_shop");

    let choices = getAllItemNames(shopType);
    const focusedValue = interaction.options.getFocused();
    let filtered = choices.filter((choice) =>
      choice.toLowerCase().startsWith(focusedValue.toLowerCase()),
    );
    if (filtered.length > 25) {
      filtered = filtered.slice(0, 24);
    }
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice })),
    );
  },
};
