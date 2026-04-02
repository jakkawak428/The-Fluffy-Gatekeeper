import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const command = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responds with the bot's ping");

export async function execute(interaction: ChatInputCommandInteraction) {
    const latency = interaction.client.ws.ping;
    await interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
}
