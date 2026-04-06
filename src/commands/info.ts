import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { version } from "../config/serverConfig";

export const command = new SlashCommandBuilder()
    .setName("info")
    .setDescription("Developer information about the bot.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🤖 Bot Information")
        .setDescription("The Fluffy Gatekeeper is a utility and entertainment bot developed for the FFF server by @jakkawak428.")
        .addFields(
            { name: "Developer", value: "@jakkawak428" },
            { name: "Current Version:", value: `${version}` },
            { name: "Host Info:", value: "Running on Windows 10, version 1903." }
        )
        .setFooter({ text: `Written in TypeScript. Discord.js v14.6.0.` });


    await interaction.reply({ embeds: [embed] });
}
