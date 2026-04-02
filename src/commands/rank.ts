import { SlashCommandBuilder, ChatInputCommandInteraction, User } from "discord.js";
import { getUserLevel, getLeaderboard } from "../handlers/levelHandler";

export const command = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Show your or another user's level and rank")
  .addUserOption(option =>
    option.setName("user")
      .setDescription("The user to check (optional)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const data = getUserLevel(user.id);
  const leaderboard = getLeaderboard(1000); // get all for ranking
  const rank = leaderboard.findIndex(entry => entry.id === user.id) + 1;

  await interaction.reply({
    content: `🏅 **${user.username}**\nLevel: **${data.level}**\nXP: **${data.xp}**\nRank: **#${rank > 0 ? rank : 'Unranked'}**`,
    allowedMentions: { users: [] }
  });
}
