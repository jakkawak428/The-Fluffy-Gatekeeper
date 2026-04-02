import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getRandomPrompt } from "../utils/promptStore";

export const command = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Get a random prompt from any prompt category");

export async function execute(interaction: ChatInputCommandInteraction) {
  const selected = getRandomPrompt();
  await interaction.reply(`🎯 **${selected.category}:** ${selected.prompt}`);
}
