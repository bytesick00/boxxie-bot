import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { getTableData } from "../utility/access_data.js";
import { Award, AwardCase, Mun } from "../utility/classes.js";
import { isAdmin } from "../utility/utils.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("giveaward")
  .setDescription("Give an award to a user (Mod only)")
  .addStringOption((option) =>
    option
      .setName("award")
      .setDescription("The award to give")
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to give the award to. Defaults to you."),
  );

async function mainFunction(interaction) {
  if (!isAdmin(interaction.member)) {
    await interaction.reply({
      content: "You need administrator permissions to give awards!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const awardName = interaction.options.getString("award");

  const munData = getTableData("muns").find((row) => row.id === targetUser.id);
  if (!munData) {
    await interaction.reply({
      content: `Could not find a registered mun for <@${targetUser.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let award;
  try {
    award = new Award(awardName);
  } catch {
    await interaction.reply({
      content: "Award not found! ❌",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mun = new Mun(munData.name);
  const awardCase = AwardCase.init(mun);
  await awardCase.giveAward(award.name, 1);

  const message = `## ${award.emoji || "🏆"} Award Given!\n**${award.name}** → **${munData.name}**`;

  const container = new ContainerBuilder().setAccentColor(11326574);
  if (award.image) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(award.image))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(message),
        ),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(message),
    );
  }

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await mainFunction(interaction);
  },
  async executePrefix(message, args) {
    if (!isAdmin(message.member)) {
      await message.reply("You need administrator permissions to give awards!");
      return;
    }

    if (!args || !args.trim()) {
      await message.reply("Usage: `!giveaward <award name> [@user]`");
      return;
    }

    const targetUser = message.mentions.users.first() || message.author;
    const cleaned = args.replace(/<@!?\d+>/g, "").trim();
    if (!cleaned) {
      await message.reply("Usage: `!giveaward <award name> [@user]`");
      return;
    }

    const munData = getTableData("muns").find((row) => row.id === targetUser.id);
    if (!munData) {
      await message.reply("Could not find a registered mun for that user.");
      return;
    }

    let award;
    try {
      award = new Award(cleaned);
    } catch {
      await message.reply("Award not found! ❌");
      return;
    }

    const mun = new Mun(munData.name);
    const awardCase = AwardCase.init(mun);
    await awardCase.giveAward(award.name, 1);
    await message.reply(
      `${award.emoji || "🏆"} **${award.name}** given to **${munData.name}**!`,
    );
  },
};
