import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { AB_DATA } from '../initialize-data.js';

let compMessage = AB_DATA.getFlavorText("Reprint_Warning");
let compPrintError = AB_DATA.getFlavorText("Reprint_Error")
let ocName;

await AB_DATA.pullData();

const cancelComponent = [
    new ContainerBuilder()
        .setAccentColor(11326574)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### 🗑️ Reprint was cancelled!"),
        ),
];

function setComponent(){

    compMessage = compMessage.replace("[OC_NAME]", ocName);
    compPrintError = compPrintError.replace("[OC_NAME]", ocName)
 
    const components = [
        new ContainerBuilder()
            .setAccentColor(11326574)
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL("https://images.unsplash.com/photo-1605364850023-a917c39f8fe9?q=80&w=1201&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## REPRINT?"),
                        new TextDisplayBuilder().setContent(compMessage),
                    ),
            ),
        new ContainerBuilder()
            .setAccentColor(11326574)
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setLabel("Reprint")
                            .setEmoji({
                                name: "🖨️",
                            })
                            .setCustomId("confirm"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Never mind")
                            .setEmoji({
                                name: "🚫",
                            })
                            .setCustomId("cancel"),
                    ),
            ),
    ];
    
    return components;
}

async function reprintMessage(interaction){
    ocName = interaction.options.getString("oc");
    const response = await interaction.reply({
        components: setComponent(ocName),
        flags: [ 
            MessageFlags.IsComponentsV2
        ],
        withResponse: true,
        }
    );

    const reprintContent = `### ${ocName} has been reprinted without error. Happy printday! 🎉`;
    const errorContent = `\`\`\`While reprinting ${ocName}, something went wrong! They experienced a REPRINTING ERROR. You may decide the error for yourself, or you may roll 1d10 to pick an error from this table. Effects may be flavored however you like.\`\`\`\n**You come back from the printer...**\n> \`1.)\` - With a different hair and/or eye color.\n> \`2.)\` - 1d6 inches shorter.\n> \`3.)\` - 1d6 inches taller.\n> \`4.)\` - Differently colored blood.\n> \`5.)\` - With impaired functioning in part of their body.\n> \`6.)\` - With a seemingly permanent illness they didn't have before. \n> \`7.)\` - With sudden chronic pain.\n> \`8.)\` - With personality change. (Less irritable, etc.)\n> \`9.)\` - With a gap in their memory.\n> \`10.)\` - Missing part of their body.\`\`\`This error will impact you until your next reprinting.\`\`\``;

    const reprintConfirmMessage = [
        new ContainerBuilder()
        .setAccentColor(11326574)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(reprintContent),
        )
    ];


    const errorMessage = [
        new ContainerBuilder()
            .setAccentColor(11326574)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(errorContent),
            )
    ];

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    try {
        const confirmation = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

        if (confirmation.customId === 'confirm') {
            const characterObject = AB_DATA.getOC(ocName, false);
            const error = characterObject.reprint()

            if(error){
                interaction.editReply({
                    components: errorMessage,
                })
            }
            else{
                interaction.editReply({
                    components: reprintConfirmMessage,
                })
            }

        } else if (confirmation.customId === 'cancel') {
            await confirmation.editReply({components: cancelComponent});
        }
    } catch {
        await interaction.editReply({components: cancelComponent});
    }
}

const data = new SlashCommandBuilder() 
    .setName('reprint')
    .setDescription('Reprints your character') 
    .addStringOption((option)=>
        option 
            .setName('oc')
            .setDescription('OC name (shows top 25 matching names)')
            .setRequired(true)
            .setAutocomplete(true)
    );

export default{
    data: data,
    async execute(interaction) {
        await reprintMessage(interaction);
    },
    async autocomplete(interaction) {
		let choices = AB_DATA.allOCNames;
		const focusedValue = interaction.options.getFocused();
        let filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
        if(filtered.length > 25){
            filtered = filtered.slice(0, 24)
        }
		await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
	},
} 