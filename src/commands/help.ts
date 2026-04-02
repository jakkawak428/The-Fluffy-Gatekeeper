import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the available commands");

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📚 Help - Available Commands")
        .addFields(
            { name: "/about", value: "Displays information about the bot" },
            { name: "/archive", value: "Moves the current channel to the FFF Channel Archive (Staff only)" },
            { name: "/restore", value: "Restores a channel from the archive to a specified category (Staff only)." },
            { name: "/blackjack", value: "Play a game of Blackjack against the bot" },
            { name: "/paranoia", value: "Return a paranoia prompt" },
            { name: "/ping", value: "Responds with the bot's ping" },
            { name: "/help", value: "Shows this help message" },
            { name: "/userinfo", value: "Displays information about a user" },
            { name: "/rng", value: "Generate a random number" },
            { name: "/summarize", value: "Summarize recent messages in the channel" },
            { name: "/level", value: "Show your current level and XP" },
            { name: "/leaderboard", value: "View the top users by level" },
            { name: "/rank", value: "Show your rank among all users" },
            { name: "/about", value: "Learn what this bot is for" },
            { name: "/warn", value: "Warn a user (admin only)" },
            { name: "/verify", value: "Submit a verification application" },
            { name: "/dare", value: "Get a random Dare prompt" },
            { name: "/truth", value: "Get a random Truth prompt" },
            { name: "/tod", value: "Get a random Truth or Dare prompt" },
            { name: "/random", value: "Get a random prompt of any kind" },
            { name: "/suggest", value: "Suggest a new prompt for Truth or Dare // Would You Rather // Paranoia." },
            { name: "/wyr", value: "Get a random Would You Rather prompt" },
        )
        .setFooter({ text: "Want more stuff added? DM @jakkawak428 for suggestions!" });

    await interaction.reply({ embeds: [embed] });
}
