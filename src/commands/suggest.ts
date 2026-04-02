import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { addPrompt } from "../utils/promptStore";

export const command = new SlashCommandBuilder()
  .setName("suggest")
  .setDescription("Suggest a new prompt for Truth, Dare, Would You Rather, or Paranoia")
  .addStringOption(option =>
    option
      .setName("prompt")
      .setDescription("The prompt text to suggest")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("category")
      .setDescription("The category for this prompt")
      .setRequired(true)
      .addChoices(
        { name: "Truth", value: "truth" },
        { name: "Dare", value: "dare" },
        { name: "Would You Rather", value: "wyr" },
        { name: "Paranoia", value: "paranoia" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const prompt = interaction.options.getString("prompt", true);
  const category = interaction.options.getString("category", true) as "truth" | "dare" | "wyr" | "paranoia";

  try {
    addPrompt(category, prompt);

    const categoryNames: Record<string, string> = {
      truth: "Truth",
      dare: "Dare",
      wyr: "Would You Rather",
      paranoia: "Paranoia"
    };

    await interaction.reply({
      content: `✅ Thank you for your suggestion! Your **${categoryNames[category]}** prompt has been added:\n\n*"${prompt}"*`,
      ephemeral: false,
    });
  } catch (error) {
    console.error("Error adding prompt:", error);
    await interaction.reply({
      content: "❌ Sorry, there was an error adding your prompt. Please try again later.",
      ephemeral: true,
    });
  }
}
