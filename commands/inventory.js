import {
  SlashCommandBuilder,
  CommandInteraction,
  MessageFlags,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  errorComponent,
  getChooseItem,
  getConfirmUseComponents,
  getInventoryComponents,
  getItemInfoContainer,
  simpleComponent,
} from "../utility/components.js";
import { getData } from "../utility/access_data.js";
import { Inventory, Mun } from "../utility/classes.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("inventory")
  .setDescription("Interact with your inventory!");

const viewSubcommand = new SlashCommandSubcommandBuilder()
  .setName("view")
  .setDescription("View your inventory!");

const useSubcommand = new SlashCommandSubcommandBuilder()
  .setName("use")
  .setDescription("Quickly use an item from your inventory")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("The item to use")
      .setRequired(true)
      .setAutocomplete(true),
  );

let currentItem;

commandBuilder.addSubcommand(viewSubcommand);
commandBuilder.addSubcommand(useSubcommand);

function displayInventory(inventory) {
  const invComponent = getInventoryComponents(inventory);

  return {
    components: invComponent,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

/**
 *
 * @async
 * @param {string} itemName
 * @param {Inventory} inventory
 * @returns {{}}
 */
function confirmUseItem(itemName, inventory) {
  currentItem = itemName;
  const thisItem = inventory.getItem(itemName);

  if (thisItem === "Not in inventory!") {
    throw new Error("Not in inventory!");
  }

  const consumable = thisItem.type === "Consumable";

  const component = getConfirmUseComponents(
    thisItem.name,
    thisItem.image,
    consumable,
    inventory.getItemQuantity(itemName),
  );

  return {
    components: component,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

function chooseItem(inventory) {
  const allItems = inventory.getAllItemNames();

  const comp = getChooseItem(allItems);

  return {
    components: comp,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

async function mainFunction(interaction) {
  const munID = interaction.user.id;
  const munName = getData("muns", "id", munID).name;

  const mun = new Mun(munName);
  const thisInventory = await mun.inventory;

  await interaction.deferReply();
  const choice = interaction.options.getSubcommand();
  let payload;

  switch (choice) {
    case "view":
      payload = displayInventory(thisInventory);
      break;

    case "use":
      const useItem = interaction.options.getString("item");
      payload = confirmUseItem(useItem, thisInventory);
      break;

    default:
      break;
  }

  const reply = await interaction.editReply(payload);

  await setCollectionFilter(choice, reply, interaction, thisInventory);
}

/**
 *
 * @param {string} commandChoice
 * @param {*} reply
 * @param {*} interaction
 * @param {Inventory} inventory
 */
async function setCollectionFilter(
  commandChoice,
  reply,
  interaction,
  inventory,
) {
  //   try {
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
    case "view":
      if (response === "use") {
        const newComp = chooseItem(inventory);
        const newResponse = await componentResponse.update(newComp);
        await setCollectionFilter(
          "confirm",
          newResponse,
          interaction,
          inventory,
        );
      } else if (response === "info") {
        const newComp = chooseItem(inventory);
        const newResponse = await componentResponse.update(newComp);
        await setCollectionFilter(
          "show_info",
          newResponse,
          interaction,
          inventory,
        );
      } else {
        await interaction.deleteReply();
      }

      break;

    case "confirm":
      const itemChoice = componentResponse.values[0];
      currentItem = itemChoice;

      const newComp = confirmUseItem(currentItem, inventory);
      const newResponse = await componentResponse.update(newComp);
      await setCollectionFilter("use", newResponse, interaction, inventory);

      break;

    case "show_info":
      
      const thisItemChoice = componentResponse.values[0]
      currentItem = thisItemChoice;

      const item = inventory.getItem(thisItemChoice);
      const newComponents = getItemInfoContainer(
        item.name,
        item.buyPrice,
        item.description,
        item.image,
        item.type,
        true
      );
      const thisComp = {
        components: newComponents,
        flags: MessageFlags.IsComponentsV2,
        withResponse: true,
      };
      const thisResponse = await componentResponse.update(thisComp);
      await setCollectionFilter("handle_info", thisResponse, interaction, inventory);

      break;
    case "handle_info":
      if(response === "inventory"){
        const newComp = displayInventory(inventory)
        const newResponse = await componentResponse.update(newComp);
        await setCollectionFilter("view", newResponse, interaction, inventory)
      }
      else{
        const newComp = confirmUseItem(currentItem, inventory)
        const newResponse = await componentResponse.update(newComp)
        await setCollectionFilter("use", newResponse, interaction, inventory)
      }

      break;
    case "use":
      if (response === "confirm") {
        try {
          const thumbnail = getData("shop", "name", currentItem).image;
          const outcome = await inventory.useItem(currentItem);
          let consumeText = "";
          if (outcome.consumed) {
            consumeText = `\n(1x) ${currentItem} was consumed.`;
          }

          const message =
            `## Used ${currentItem}! 📦\n \>\>\> ${outcome.text}` + consumeText;
          await componentResponse.update({
            components: simpleComponent(message, thumbnail),
            withResponse: false,
          });
        } catch (error) {
          throw error;
        }
      } else {
        await componentResponse.update({
          components: simpleComponent("Use item canceled! 🗑️"),
          withResponse: false,
        });
      }
      break;
    default:
      break;
  }
  //   } catch {
  //     await interaction.editReply({ components: errorComponent });
  //   }
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

    let choices = thisInventory.getAllItemNames();
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
