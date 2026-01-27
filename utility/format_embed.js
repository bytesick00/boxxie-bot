import { SlashCommandBuilder, EmbedBuilder, Embed } from 'discord.js';

export function addStandardFormat(embedBuilder){
    embedBuilder
    .setAuthor({
        name: "New Millennium Technologies",
        iconURL: "https://images2.imgbox.com/4e/ec/hLgncloX_o.png",
        })
    .setColor("#acd46e")
        .setFooter({
        text: "The work is important; your body is not.",
        iconURL: "https://img.icons8.com/?size=100&id=lTImOaDFYG9P&format=png&color=000000",
        });

    return embedBuilder;
}

export function basicEmbed(title, description, thumbnail="", image = "", link = ""){
    let embedMessage = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)

    if(thumbnail!=""){
        embedMessage.setThumbnail(thumbnail);
    }
    if(image!=""){
        embedMessage.setImage(image);
    }
    if(link!=""){
        embedMessage.setURL(link);
    }
    embedMessage = addStandardFormat(embedMessage);

    return embedMessage;
}