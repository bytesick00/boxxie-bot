import { SlashCommandBuilder, EmbedBuilder, Embed, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, MessageFlags, Message } from 'discord.js';
import { AnomalyBoxData, Character } from '../utility/classes.js';
import { addStandardFormat, basicEmbed } from '../utility/format_embed.js';
import { AB_DATA } from '../initialize-data.js';


/**
 * Description placeholder
 *
 * @type {AnomalyBoxData}
 */

function createProfileEmbed(OC){
    const embedMessage = new EmbedBuilder()
        .setTitle(OC.name)
        .addFields(
        {
            name: "",
            value: "**```\n📋 DETECTOR PROFILE \n```**",
            inline: false
        },
        {
            name: "`AGE:`",
            value: `${OC.age}`,
            inline: true
        },
        {
            name: "`PRONOUNS:`",
            value: `${OC.pronouns}`,
            inline: true
        },
        {
            name: "`GENDER:`",
            value: `${OC.gender}`,
            inline: true
        },
        {
            name: "`HEIGHT:`",
            value: `${OC.height}`,
            inline: true
        },
        {
            name: "`BIRTHDAY:`",
            value: `${OC.birthday}`,
            inline: true
        },
        {
            name: "`BLOOD TYPE:`",
            value: `${OC.bloodType}`,
            inline: true
        },
        {
            name: "",
            value: "**```\n🎲 CURRENT STATS\n```**",
            inline: false
        },
        {
            name: "`WIT:`",
            value: `${OC.currentStats.wit}`,
            inline: true
        },
        {
            name: "`CHR:`",
            value: `${OC.currentStats.cha}`,
            inline: true
        },
        {
            name: "`STR:`",
            value: `${OC.currentStats.str}`,
            inline: true
        },
        {
            name: "`MVE:`",
            value: `${OC.currentStats.mve}`,
            inline: true
        },
        {
            name: "`DUR:`",
            value: `${OC.currentStats.dur}`,
            inline: true
        },
        {
            name: "`LCK:`",
            value: `${OC.currentStats.lck}`,
            inline: true
        },
        {
            name: "",
            value: "**```\n🗃️ OTHER\n```**",
            inline: false
        },
        {
            name: "`REPRINTS:`",
            value: `${OC.currentStats.reprints}`,
            inline: true
        },
        {
            name: "`MUN:`",
            value: OC.mun,
            inline: true
        },
        )
        .setThumbnail(OC.photoLink);

    if(OC.aka != ""){
        embedMessage
        .setDescription(`> ***AKA**: ${OC.aka}*`)
    }

    return addStandardFormat(embedMessage);
}

function viewStats(OC){
    const embedMessage = new EmbedBuilder()
        .setTitle(OC.name)
        .setFields(
        {
            name: "",
            value: "**```\n🎲 CURRENT STATS\n```**",
            inline: false
        },
        {
            name: "`WIT:`",
            value: `${OC.currentStats.wit}`,
            inline: true
        },
        {
            name: "`CHR:`",
            value: `${OC.currentStats.cha}`,
            inline: true
        },
        {
            name: "`STR:`",
            value: `${OC.currentStats.str}`,
            inline: true
        },
        {
            name: "`MVE:`",
            value: `${OC.currentStats.mve}`,
            inline: true
        },
        {
            name: "`DUR:`",
            value: `${OC.currentStats.dur}`,
            inline: true
        },
        {
            name: "`LCK:`",
            value: `${OC.currentStats.lck}`,
            inline: true
        },
        {
            name: "",
            value: `**\`\`\`\n🖨️ REPRINTS: ${OC.currentStats.reprints}\n\`\`\`**`,
            inline: false
        },
        )
        .setThumbnail(OC.photoLink);

    return addStandardFormat(embedMessage);
}

async function changeStat(interaction, OC, statName, newValue, origStat){
    OC.currentStats.setProp(statName, newValue);

    let title;
    let description = `**${statName}:** \`${origStat}\` ➡️ \`${OC[statName.toLowerCase()]}\`\n\n`;
    if(newValue > origStat){
        title = "-# \`STAT UP ⏫\`"
        description = description + title + ` *yippee!* <a:mamegoma:1467091008704483500>`
    }
    else if(newValue < origStat){
        title = "-# \`STAT DOWN ⏬\`"
        description = description + title + ` *tough break...* <a:Rilakkuma:1467091591478116445>`
    }
    else{
        title = "-# \`STAT 🆗\`"
        description = description + title +` *Must have been the wind...* <a:oiiacat:1467094624274350260>`
    }

    const embedMessage = basicEmbed(OC.name, description, OC.photoLink);

    await interaction.editReply({embeds: [embedMessage]});

    if(interaction.options.getBoolean('show-stats', false) === true){
        await interaction.followUp({
        embeds:[viewStats(OC)],
        flags: [MessageFlags.Ephemeral]
     })
    }
    
}

const statCommandGroup =
     new SlashCommandSubcommandGroupBuilder()
        .setName('stats')
        .setDescription('View or change this OC\'s current stats. Defaults to view.')
        .addSubcommand((subcommand)=>
            subcommand
            .setName('view')
            .setDescription('View this OC\'s current stats.')
            .addStringOption((option)=>
                option 
                    .setName('oc')
                    .setDescription('OC name (shows top 25 matching names)')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        )

        .addSubcommand((subcommand)=>
            subcommand
            .setName('change')
            .setDescription('Change one of this OC\'s stats.')
            .addStringOption((option)=>
                option 
                    .setName('oc')
                    .setDescription('OC name (shows top 25 matching names)')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption((option)=>
                option
                .setName('stat')
                .setDescription('The stat you want to change.')
                .setChoices([
                    {name: 'WIT', value:'WIT'},
                    {name: 'CHA', value: 'CHA'},
                    {name: 'STR', value: 'STR'},
                    {name: 'MVE', value: 'MVE'},
                    {name: 'DUR', value: 'DUR'},
                    {name: 'LCK', value: 'LCK'}
                ])
                .setRequired(true)
            )
            .addIntegerOption((option)=>
                option
                .setName('new-value')
                .setDescription('Your stat\'s new value.')
                .setRequired(true)
            )
            .addBooleanOption((option)=>
                option
                .setName('show-stats')
                .setDescription('View your current stats after changing?'))
        );

const profileCommandGroup = 
        new SlashCommandSubcommandBuilder()
        .setName('profile')
        .setDescription('View this OC\'s employee profile.')
        .addStringOption((option)=>
            option 
                .setName('oc')
                .setDescription('OC name (shows top 25 matching names)')
                .setRequired(true)
                .setAutocomplete(true)
        );

const data = new SlashCommandBuilder() 
    .setName('oc')
    .setDescription('Commands related to an OC.')
    .addSubcommand(profileCommandGroup)
    .addSubcommandGroup(statCommandGroup);
        
export default{
    data: data,
    async execute(interaction) {
        await interaction.deferReply();
        const characterChoice = interaction.options.getString("oc");
        let characterInfo;

        try{
            characterInfo = AB_DATA.getOC(characterChoice, true)
        }
        catch{
            await interaction.editReply(`I couldn't find an OC named ${characterChoice} :( Please use the autocomplete to select your OC.`)
        } 

        if(interaction.options.getSubcommand()==='profile'){
            await interaction.editReply(
                {embeds: [createProfileEmbed(characterInfo)]}
            );
        }
        else{
            if(interaction.options.getSubcommand()==='view'){
                await interaction.editReply({
                        embeds: [viewStats(characterInfo)]
                    }
                );
            }
            else{
                const chosenStat = interaction.options.getString('stat');
                const newValue = interaction.options.getInteger('new-value');
                const origValue = characterInfo[chosenStat.toLowerCase()];

                await changeStat(interaction, characterInfo, chosenStat, newValue, origValue)
            }
        }
        
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