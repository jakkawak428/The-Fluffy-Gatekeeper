import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { version } from "../config/serverConfig";

export const command = new SlashCommandBuilder()
    .setName("info")
    .setDescription("Developer information about the bot.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🤖 Bot Information")
        .setDescription("Basic utility and info bot, specifically made for the FFF server.")
        .addFields(
            { name: "Developer", value: "@jakkawak428" },
            { name: "Current Version:", value: `${version}` },
            { name: "Host Info:", value: "Running on Windows 10, version 1903." }
        )
        .setFooter({ text: `Written in TypeScript. Runtime: Node.js ${process.version}. ts-node-dev version 10.9.2, typescript version 5.9.3.` });


    await interaction.reply({ embeds: [embed] });
}
