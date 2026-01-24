import { SlashCommandBuilder, EmbedBuilder, Embed } from 'discord.js';
import {initializeTables, initializeOCs, getTable, getCharacter} from '../../utility/dataFunctions.js'
import { Character } from '../../utility/classes.js';

let allCharacters;
const choices = await initializeTables().then(dataTables=>{
            allCharacters = initializeOCs(getTable("OC Info", dataTables), getTable("Base Stats", dataTables), getTable("Current Stats", dataTables));
            return allCharacters.map(OC => (OC.name)
            );
        });

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

function createProfileEmbed(OC = new Character()){
    const embedMessage = new EmbedBuilder()
        .setAuthor({
        name: "New Millennium Technologies",
        iconURL: "https://media.discordapp.net/attachments/1458216506403061772/1462992359246532826/favi.png?ex=6970354f&is=696ee3cf&hm=3f77e1c60ce57542047078047968a0ca07eb527254d9e872a1134ef2b501c36d&=&format=webp&quality=lossless",
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
            value: OC.age,
            inline: true
        },
        {
            name: "`PRONOUNS:`",
            value: OC.pronouns,
            inline: true
        },
        {
            name: "`GENDER:`",
            value: OC.gender,
            inline: true
        },
        {
            name: "`HEIGHT:`",
            value: OC.height,
            inline: true
        },
        {
            name: "`BIRTHDAY:`",
            value: OC.birthday,
            inline: true
        },
        {
            name: "`BLOOD TYPE:`",
            value: OC.bloodType,
            inline: true
        },
        {
            name: "",
            value: "**```\n🎲 STATS\n```**",
            inline: false
        },
        {
            name: "`WIT:`",
            value: OC.baseStats.wit,
            inline: true
        },
        {
            name: "`CHR:`",
            value: OC.currentStats.cha,
            inline: true
        },
        {
            name: "`STR:`",
            value: OC.currentStats.str,
            inline: true
        },
        {
            name: "`MVE:`",
            value: OC.currentStats.mve,
            inline: true
        },
        {
            name: "`DUR:`",
            value: OC.currentStats.dur,
            inline: true
        },
        {
            name: "`LCK:`",
            value: OC.currentStats.lck,
            inline: true
        },
        {
            name: "",
            value: "**```\n🗃️ OTHER\n```**",
            inline: false
        },
        {
            name: "`REPRINTS:`",
            value: OC.currentStats.reprints,
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


export default{
    data: data,
    async execute(interaction) {
        const characterChoice = interaction.options.getString("oc");
        console.log(characterChoice);

        try{
            const characterInfo = getCharacter(characterChoice, allCharacters);
            // console.log(characterInfo.currentStats)
            await interaction.reply(
                {embeds: [createProfileEmbed(characterInfo)]}
            );
        }
        catch{
            await interaction.reply(`I couldn't find an OC named ${characterChoice} :( Please use the autocomplete to select your OC.`)
        }
    },
    async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
        let filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
        if(filtered.length > 25){
            filtered = filtered.slice(0, 24)
        }
		await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
	},
}