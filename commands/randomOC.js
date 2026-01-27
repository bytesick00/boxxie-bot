import { SlashCommandBuilder, EmbedBuilder, Client } from 'discord.js';
import { AB_DATA } from '../initialize-data.js';
import { addStandardFormat } from '../utility/format_embed.js';

export default{
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Replies with a random OC\'s name.')
        .addStringOption((option)=>
            option
                .setName('pick')
                .setDescription('Get a random OC or pair of two OCs.')
                .setRequired(true)
                .addChoices(
                    {
                        name:'OC', 
                        value:'oc'
                    }, 
                    {
                        name:'Pairing',
                        value: 'pairing'
                    })
        ),
    async execute(interaction) {

        const choice = interaction.options.getString('pick');
        
        let characterNames = AB_DATA.allOCNames;
        const ocNamesLength = characterNames.length; 
        const randomNumber = Math.round(Math.random() * ocNamesLength);
        const character = AB_DATA.getOC(characterNames[randomNumber]);

        let embedMessage;
        if(choice==='oc'){
            embedMessage = new EmbedBuilder()
            .setTitle('🎲 Pick Random Character <a:catchair:1462583100352626893>')
            .setDescription(`I pick... **${character.name}!**`)
            .setThumbnail(character.photoLink)
 
        }else{
            const secondNumber = Math.round(Math.random() * ocNamesLength);
            const character2 = AB_DATA.getOC(characterNames[secondNumber]);

            embedMessage = new EmbedBuilder()
            .setTitle('🎲 Pick Random OC Pairing <:shouldergrab:1462601546993762458>')
            .setDescription(`I pick... **${character.name}** and **${character2.name}!**`)

        }

        embedMessage = addStandardFormat(embedMessage);
        await interaction.reply(
            {embeds: [embedMessage]}
        );
    },
}