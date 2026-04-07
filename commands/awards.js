import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { getTableData } from "../utility/access_data.js";
import { AwardCase, Mun } from "../utility/classes.js";

// Category placeholder emojis (shown when award not yet earned)
const CATEGORY_PLACEHOLDER = {
  Roleplay: "<:a_roleplay:1491125415245254697>",
  Event: "<:a_event:1491125479481016482>",
  "Group Work": "<:a_groupwork:1491125633546190928>",
  Milestones: "<:a_milestones:1491125533004791880>",
};

const CATEGORY_ORDER = ["Event", "Roleplay", "Group Work", "Milestones"];

const commandBuilder = new SlashCommandBuilder()
  .setName("awards")
  .setDescription("View a user's awards")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user whose awards to view. Defaults to you."),
  );

function buildAwardViewComponents(munData, awardCase) {
  const allAwards = getTableData("awards") || [];
  const container = new ContainerBuilder().setAccentColor(11326574);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${munData.name}'s Awards`),
  );

  // Group awards by category
  const grouped = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = [];
  }
  for (const award of allAwards) {
    const cat = award.type || "Milestones";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(award);
  }

  for (const cat of CATEGORY_ORDER) {
    const awards = grouped[cat];
    if (!awards || awards.length === 0) continue;

    const placeholder = CATEGORY_PLACEHOLDER[cat] || "❓";

    const line = awards
      .map((award) => {
        if (awardCase.hasAward(award.name)) {
          return award.emoji || "🏆";
        } else {
          return placeholder;
        }
      })
      .join(" ");

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${cat}`),
      new TextDisplayBuilder().setContent(line),
    );
  }

  // Handle categories not in CATEGORY_ORDER
  for (const [cat, awards] of Object.entries(grouped)) {
    if (CATEGORY_ORDER.includes(cat)) continue;
    if (!awards || awards.length === 0) continue;
    const placeholder = CATEGORY_PLACEHOLDER[cat] || "❓";
    const line = awards
      .map((award) => {
        if (awardCase.hasAward(award.name)) {
          return award.emoji || "🏆";
        } else {
          return placeholder;
        }
      })
      .join(" ");

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${cat}`),
      new TextDisplayBuilder().setContent(line),
    );
  }

  return [container];
}

async function mainFunction(interaction) {
  await interaction.deferReply();
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const munData = getTableData("muns").find((row) => row.id === targetUser.id);

  if (!munData) {
    await interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(11326574)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Could not find a registered mun for <@${targetUser.id}>. ❌`,
            ),
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const mun = new Mun(munData.name);
  const awardCase = AwardCase.init(mun);

  const components = buildAwardViewComponents(munData, awardCase);
  await interaction.editReply({
    components,
    flags: MessageFlags.IsComponentsV2,
  });
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async executePrefix(message, args) {
    const targetUser = message.mentions?.users?.first();
    const userId = targetUser ? targetUser.id : message.author.id;
    const munData = getTableData("muns").find((row) => row.id === userId);

    if (!munData) {
      await message.reply(
        targetUser
          ? "That user doesn't have a registered profile! ❌"
          : "You don't have a registered profile! ❌",
      );
      return;
    }

    const mun = new Mun(munData.name);
    const awardCase = AwardCase.init(mun);
    const components = buildAwardViewComponents(munData, awardCase);
    await message.reply({
      components,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
