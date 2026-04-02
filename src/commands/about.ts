import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { version } from "../config/serverConfig";

export const command = new SlashCommandBuilder()
    .setName("about")
    .setDescription("Information about the bot and its purpose");

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🤖 About The Fluffy Gatekeeper")
        .setDescription("A small utility & entertainment bot for FFF, developed by @jakkawak428.")
        .addFields(
            { name: "Purpose", value: "Leveling, entertainment, and community engagement." },
            { name: "Server", value: "This bot runs exclusively in the FFF server where friends gather to chat and have fun." },
            { name: "Usage", value: "Use /help for a list of commands! Please, give @jakkawak428 any feedback on the bot!" }
        )
        .setFooter({ text: `Version ${version}` });

    await interaction.reply({ embeds: [embed] });
}