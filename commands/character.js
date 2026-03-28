import { SlashCommandBuilder, EmbedBuilder, Embed, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, MessageFlags, Message } from 'discord.js';
// import { AnomalyBoxData, Character } from '../utility/classes.js';
import { addStandardFormat, basicEmbed } from '../utility/format_embed.js';
import { getTableData } from '../utility/access_data.js';
import { Character } from '../utility/classes.js';
// import { AB_DATA } from '../initialize-data.js';



/**
 * Description placeholder
 *
 * @param {Character} OC 
 * @returns {Embed} 
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
        .setThumbnail(OC.image);

    if(OC.aka != ""){
        embedMessage
        .setDescription(`> ***AKA**: ${OC.aka}*`)
    }

    return addStandardFormat(embedMessage);
}


/**
 * Description placeholder
 *
 * @param {Character} OC 
 * @returns {*} 
 */
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
        .setThumbnail(OC.image);

    return addStandardFormat(embedMessage);
}


/**
 * Description placeholder
 *
 * @async
 * @param {*} interaction 
 * @param {Character} OC 
 * @param {*} statName 
 * @param {*} newValue 
 * @param {*} origStat 
 * @returns {*} 
 */
async function changeStat(interaction, OC, statName, newValue, origStat){
    // OC.currentStats.setProp(statName, newValue);
    // OC[statName]

    await OC.currentStats.setStat(statName.toLowerCase(), newValue);

    let title;
    let description = `**${statName}:** \`${origStat}\` ➡️ \`${OC.currentStats[statName.toLowerCase()]}\`\n\n`;
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

    const embedMessage = basicEmbed(OC.name, description, OC.image);

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
                    {name: 'WIT', value:'wit'},
                    {name: 'CHA', value: 'cha'},
                    {name: 'STR', value: 'str'},
                    {name: 'MVE', value: 'mve'},
                    {name: 'DUR', value: 'dur'},
                    {name: 'LCK', value: 'lck'}
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
            characterInfo = new Character(characterChoice);
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
                const origValue = characterInfo.currentStats[chosenStat.toLowerCase()];

                await changeStat(interaction, characterInfo, chosenStat, newValue, origValue)
            }
        }
        
    },
    async autocomplete(interaction) {
        let choices = getTableData('ocs')
        choices = choices.map(row=> row.name)
		const focusedValue = interaction.options.getFocused();
        let filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
        if(filtered.length > 25){
            filtered = filtered.slice(0, 24)
        }
		await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
	},
    async executePrefix(message, args) {
        if (!args) {
            await message.reply('Usage: `!oc <name>`, `!oc profile <name>`, `!oc stats <name>`, `!oc change <name> <stat> <value>`');
            return;
        }
        const parts = args.split(/\s+/);
        let subcommand = parts[0]?.toLowerCase();
        let characterName;
        const subcommands = ['profile', 'stats', 'change'];
        if (!subcommands.includes(subcommand)) {
            subcommand = 'profile';
            characterName = args.trim();
        } else {
            characterName = parts.slice(1).join(' ');
        }
        if (subcommand === 'change') {
            const statKeywords = ['wit', 'cha', 'str', 'mve', 'dur', 'lck'];
            const value = parseInt(parts[parts.length - 1]);
            const stat = parts[parts.length - 2]?.toLowerCase();
            if (isNaN(value) || !statKeywords.includes(stat)) {
                await message.reply('Usage: `!oc change <name> <stat> <value>` (stats: wit, cha, str, mve, dur, lck)');
                return;
            }
            characterName = parts.slice(1, -2).join(' ');
            let characterInfo;
            try {
                characterInfo = new Character(characterName);
            } catch {
                await message.reply(`I couldn't find an OC named "${characterName}".`);
                return;
            }
            const origValue = characterInfo.currentStats[stat];
            await characterInfo.currentStats.setStat(stat, value);
            let description = `**${stat.toUpperCase()}:** \`${origValue}\` ➡️ \`${characterInfo.currentStats[stat]}\`\n\n`;
            if (value > origValue) {
                description += "-# \`STAT UP ⏫\` *yippee!*";
            } else if (value < origValue) {
                description += "-# \`STAT DOWN ⏬\` *tough break...*";
            } else {
                description += "-# \`STAT 🆗\` *Must have been the wind...*";
            }
            const embed = basicEmbed(characterInfo.name, description, characterInfo.image);
            await message.reply({ embeds: [embed] });
        } else {
            let characterInfo;
            try {
                characterInfo = new Character(characterName);
            } catch {
                await message.reply(`I couldn't find an OC named "${characterName}".`);
                return;
            }
            if (subcommand === 'stats') {
                await message.reply({ embeds: [viewStats(characterInfo)] });
            } else {
                await message.reply({ embeds: [createProfileEmbed(characterInfo)] });
            }
        }
    },
}