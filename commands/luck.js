import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";
import {
  activeRuns,
  updateTrackerPost,
  persistActiveRuns,
} from "../utility/sublevel_handler.js";
import { Character } from "../utility/classes.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("luck")
  .setDescription("Change a character's luck during a sublevel run.")
  .addStringOption((option) =>
    option
      .setName("character")
      .setDescription("The character to affect")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Amount of luck to change")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Add or remove luck?")
      .setRequired(true)
      .addChoices(
        { name: "Add", value: "add" },
        { name: "Remove", value: "remove" },
      ),
  );

function applyLuckChange(channelId, characterName, amount, type) {
  const run = activeRuns.get(channelId);
  if (!run) return { error: "No active sublevel run in this channel." };

  const charData = run.characters.get(characterName);
  if (!charData)
    return { error: `${characterName} is not registered in this run.` };

  const oldLuck = charData.luck;
  if (type === "add") {
    charData.luck += amount;
  } else {
    charData.luck -= amount;
  }
  const newLuck = charData.luck;

  persistActiveRuns().catch((e) =>
    console.error("Failed to persist after luck change:", e),
  );

  return { oldLuck, newLuck, characterName };
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    const characterName = interaction.options.getString("character");
    const amount = interaction.options.getInteger("amount");
    const type = interaction.options.getString("type");

    await interaction.deferReply();

    if (amount < 1) {
      await interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(11326574)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "### ❌ Amount must be at least 1!",
              ),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const result = applyLuckChange(
      interaction.channel.id,
      characterName,
      amount,
      type,
    );

    if (result.error) {
      await interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(11326574)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### ❌ ${result.error}`,
              ),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const emoji = type === "add" ? "🍀" : "🍂";
    const verb = type === "add" ? "gained" : "lost";
    const arrow = type === "add" ? "⬆️" : "⬇️";

    let image = "";
    try {
      const character = new Character(characterName);
      image = character.image || "";
    } catch {
      /* no image */
    }

    const container = new ContainerBuilder().setAccentColor(11326574);

    if (image) {
      container.addSectionComponents(
        new SectionBuilder()
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(image))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${emoji} Luck ${type === "add" ? "Increased" : "Decreased"}!`,
            ),
            new TextDisplayBuilder().setContent(
              `**${characterName}** ${verb} **${amount}** luck!`,
            ),
          ),
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${emoji} Luck ${type === "add" ? "Increased" : "Decreased"}!`,
        ),
        new TextDisplayBuilder().setContent(
          `**${characterName}** ${verb} **${amount}** luck!`,
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${arrow} **Luck:** \`${result.oldLuck}\` ➡️ \`${result.newLuck}\``,
      ),
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    const run = activeRuns.get(interaction.channel.id);
    await updateTrackerPost(interaction.channel, run);
  },
  async autocomplete(interaction) {
    const channelId = interaction.channel.id;
    const run = activeRuns.get(channelId);

    if (!run || run.characters.size === 0) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = interaction.options.getFocused().toLowerCase();
    const names = [...run.characters.keys()];
    const filtered = names.filter((name) =>
      name.toLowerCase().startsWith(focusedValue),
    );

    await interaction.respond(
      filtered.slice(0, 25).map((name) => ({ name, value: name })),
    );
  },
  async executePrefix(message, args) {
    if (!args) {
      await message.reply(
        "Usage: `!luck <character> <amount> <add|remove>`",
      );
      return;
    }

    const parts = args.trim().split(/\s+/);
    if (parts.length < 3) {
      await message.reply(
        "Usage: `!luck <character> <amount> <add|remove>`",
      );
      return;
    }

    const type = parts[parts.length - 1].toLowerCase();
    if (type !== "add" && type !== "remove") {
      await message.reply("Type must be `add` or `remove`.");
      return;
    }

    const amountStr = parts[parts.length - 2];
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount < 1) {
      await message.reply("Amount must be a positive number.");
      return;
    }

    const characterName = parts.slice(0, -2).join(" ");
    const result = applyLuckChange(
      message.channel.id,
      characterName,
      amount,
      type,
    );

    if (result.error) {
      await message.reply(`❌ ${result.error}`);
      return;
    }

    const emoji = type === "add" ? "🍀" : "🍂";
    const verb = type === "add" ? "gained" : "lost";
    const arrow = type === "add" ? "⬆️" : "⬇️";

    let image = "";
    try {
      image = new Character(characterName).image || "";
    } catch {
      /* no image */
    }

    const description = `**${characterName}** ${verb} **${amount}** luck!\n${arrow} **Luck:** \`${result.oldLuck}\` ➡️ \`${result.newLuck}\``;
    const embed = basicEmbed(
      `${emoji} Luck ${type === "add" ? "Increased" : "Decreased"}!`,
      description,
      image,
    );
    await message.reply({ embeds: [embed] });

    const run = activeRuns.get(message.channel.id);
    if (run) await updateTrackerPost(message.channel, run);
  },
};
