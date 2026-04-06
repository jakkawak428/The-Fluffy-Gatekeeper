import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fs from "fs";
import { get } from "http";

export const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the available commands");

// rather than hardcoding every command, reads the command files and generates the list dynamically.
async function getCommandList(){
    const commandList: string[] = [];
    fs.readdirSync("./src/commands").forEach(file => {
        if(file.endsWith(".ts")){
            const command = require(`./${file}`).command;
            commandList.push(`/${command.name} - ${command.description}`);
        }
    });
    return commandList;
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📚 Help - Available Commands")
        .addFields(
            { name: "Commands", value: await getCommandList().then(commands => commands.join("\n")) || "No commands found." }
        )
        .setFooter({ text: "Want more stuff added? DM @jakkawak428 for suggestions!" });

    await interaction.reply({ embeds: [embed] });
}
