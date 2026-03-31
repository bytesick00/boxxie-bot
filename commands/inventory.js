import {
  SlashCommandBuilder,
  CommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  errorComponent,
  getInventoryComponents,
  simpleComponent,
} from "../utility/components.js";
import { getData } from "../utility/access_data.js";
import { Inventory, Mun } from "../utility/classes.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("inventory")
  .setDescription("View your inventory!");

function displayInventory(inventory, filter = "ALL", page = 0, sort = "alpha") {
  const invComponent = getInventoryComponents(inventory, filter, page, sort);

  return {
    components: invComponent,
    flags: MessageFlags.IsComponentsV2,
    withResponse: true,
  };
}

async function mainFunction(interaction) {
  await interaction.deferReply();

  const munID = interaction.user.id;
  const munName = getData("muns", "id", munID).name;

  const mun = new Mun(munName);
  const thisInventory = await mun.inventory;

  const payload = displayInventory(thisInventory);
  const reply = await interaction.editReply(payload);

  await handleCollector(reply, interaction, thisInventory, "ALL", 0, "alpha");
}

async function handleCollector(reply, interaction, inventory, currentFilter, currentPage, currentSort) {
  const collectorFilter = (i) => i.user.id === interaction.user.id;
  let componentResponse;

  try {
    try {
      componentResponse = await reply.awaitMessageComponent({
        filter: collectorFilter,
        time: 900_000,
      });
    } catch {
      componentResponse = await reply.resource.message.awaitMessageComponent({
        filter: collectorFilter,
        time: 900_000,
      });
    }
  } catch {
    return;
  }

  let nextFilter = currentFilter;
  let nextPage = currentPage;
  let nextSort = currentSort;

  if (componentResponse.customId === "inventoryCategory") {
    nextFilter = componentResponse.values[0];
    nextPage = 0;
  } else if (componentResponse.customId === "invPrev") {
    nextPage = Math.max(0, currentPage - 1);
  } else if (componentResponse.customId === "invNext") {
    nextPage = currentPage + 1;
  } else if (componentResponse.customId === "sortAlpha") {
    nextSort = "alpha";
    nextPage = 0;
  } else if (componentResponse.customId === "sortAmount") {
    nextSort = "amount";
    nextPage = 0;
  } else if (componentResponse.customId === "sortCategory") {
    nextSort = "category";
    nextPage = 0;
  }

  const payload = displayInventory(inventory, nextFilter, nextPage, nextSort);
  const newReply = await componentResponse.update({ ...payload, withResponse: true });
  await handleCollector(newReply, interaction, inventory, nextFilter, nextPage, nextSort);
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async executePrefix(message) {
    const munID = message.author.id;
    const munData = getData("muns", "id", munID);
    if (!munData) {
      await message.reply("Couldn't find your profile!");
      return;
    }
    const mun = new Mun(munData.name);
    const thisInventory = await mun.inventory;
    if (!thisInventory.items || thisInventory.items.length === 0) {
      const embed = basicEmbed(`${mun.name}'s Inventory`, 'Your inventory is empty! 📦');
      await message.reply({ embeds: [embed] });
      return;
    }
    const emojiMap = { Consumable: '💊', Collectable: '⭐', Equipment: '🛡️', Quest: '📜', Treasure: '💎', Usable: '🧪', Miscellaneous: '📦', '???': '❓' };
    const items = thisInventory.items
      .map((i) => {
        const d = getData("shop", "name", i.item);
        const shop = d?.shop || "";
        const type = d?.type || "???";
        const emoji = shop === "OOC" ? "🎁" : (emojiMap[type] || "❓");
        return { ...i, shop, emoji };
      })
      .sort((a, b) => a.item.localeCompare(b.item));
    const icLines = items.filter(i => i.shop !== "OOC").map(i => `${i.emoji} **${i.item}** ×${i.quantity}`);
    const oocLines = items.filter(i => i.shop === "OOC").map(i => `${i.emoji} **${i.item}** ×${i.quantity}`);
    const embed = basicEmbed(`${mun.name}'s Inventory`);
    embed.addFields(
      { name: 'IN CHARACTER', value: icLines.join('\n') || 'None! 🫗', inline: false },
      { name: 'OUT OF CHARACTER', value: oocLines.join('\n') || 'None! 🫗', inline: false },
    );
    await message.reply({ embeds: [embed] });
  },
};
