import { SlashCommandBuilder, EmbedBuilder, Embed } from 'discord.js';
// import {initializeTables, initializeOCs, getTable, getCharacter} from '../utility/dataFunctions.js'
import { AnomalyBoxData } from '../utility/classes.js';
import { AB_DATA } from '../initialize-data.js';

/**
 * Description placeholder
 *
 * @type {AnomalyBoxData}
 */

function createProfileEmbed(OC){
    const embedMessage = new EmbedBuilder()
        .setAuthor({
        name: "New Millennium Technologies",
        iconURL: "https://images2.imgbox.com/4e/ec/hLgncloX_o.png",
        })
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
        .setThumbnail(OC.photoLink)
        .setColor("#acd46e")
        .setFooter({
        text: "The work is important; your body is not.",
        iconURL: "https://img.icons8.com/?size=100&id=lTImOaDFYG9P&format=png&color=000000",
        });

    if(OC.aka != ""){
        embedMessage
        .setDescription(`> ***AKA**: ${OC.aka}*`)
    }

    return embedMessage;
}

const data = new SlashCommandBuilder() 
    .setName('character')
    .setDescription('Get a character\'s information.') 
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
        await interaction.deferReply();
        const characterChoice = interaction.options.getString("oc");
        let characterInfo;
        // console.log(characterChoice);
        try{
            characterInfo = AB_DATA.getOC(characterChoice, true)
        }
        catch{
            await interaction.editReply(`I couldn't find an OC named ${characterChoice} :( Please use the autocomplete to select your OC.`)
        } 
        await interaction.editReply(
                {embeds: [createProfileEmbed(characterInfo)]}
            );
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