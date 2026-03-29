import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { activeRuns } from "../utility/sublevel_handler.js";
import { basicEmbed } from "../utility/format_embed.js";

const commandBuilder = new SlashCommandBuilder()
  .setName("party")
  .setDescription("Show the current party of a sublevel run.");

function buildHPBar(current, max) {
  const barLength = 10;
  const ratio = Math.max(0, current) / max;
  const filled = Math.round(ratio * barLength);
  const empty = barLength - filled;
  return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\``;
}

function buildPartyText(run) {
  let charList = "";
  for (const [name, data] of run.characters) {
    const hpDisplay =
      data.hp !== null
        ? `❤️ **${data.hp}/${data.maxHp}** HP ${buildHPBar(data.hp, data.maxHp)}`
        : "❤️ *HP not rolled*";
    const lckDisplay =
      data.luck !== null
        ? `🍀 **${data.luck}** LCK`
        : "🍀 *Luck not set*";
    charList += `> **${name}**\n> ${hpDisplay} | ${lckDisplay}\n\n`;
  }
  return charList.trim();
}

export default {
  data: commandBuilder,
  async execute(interaction) {
    await interaction.deferReply();

    const channelId = interaction.channel.id;
    const run = activeRuns.get(channelId);

    if (!run) {
      await interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(11326574)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "### No active sublevel run in this channel!",
              ),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (run.characters.size === 0) {
      await interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(11326574)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("## 🏢 Current Party"),
              new TextDisplayBuilder().setContent(
                "*No characters registered yet.*",
              ),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const container = new ContainerBuilder().setAccentColor(11326574);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🏢 Current Party — Floor ${run.floors}`,
      ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(buildPartyText(run)),
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
  async executePrefix(message) {
    const channelId = message.channel.id;
    const run = activeRuns.get(channelId);

    if (!run) {
      await message.reply(
        "No active sublevel run in this channel!",
      );
      return;
    }

    if (run.characters.size === 0) {
      await message.reply({
        embeds: [
          basicEmbed(
            "🏢 Current Party",
            "*No characters registered yet.*",
          ),
        ],
      });
      return;
    }

    let charLines = "";
    for (const [name, data] of run.characters) {
      const hpDisplay =
        data.hp !== null
          ? `❤️ **${data.hp}/${data.maxHp}** HP`
          : "❤️ *HP not rolled*";
      const lckDisplay =
        data.luck !== null
          ? `🍀 **${data.luck}** LCK`
          : "🍀 *Luck not set*";
      charLines += `> **${name}** — ${hpDisplay} | ${lckDisplay}\n`;
    }

    const embed = basicEmbed(
      `🏢 Current Party — Floor ${run.floors}`,
      charLines.trim(),
    );
    await message.reply({ embeds: [embed] });
  },
};
