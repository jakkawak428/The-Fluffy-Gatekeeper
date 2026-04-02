import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { getLeaderboard } from "../handlers/levelHandler";
import { readFileSync } from "fs";
import path from "path";

export const command = new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show top users by level")
    .addIntegerOption(option =>
        option.setName("count")
            .setDescription("Number of users to display (default: 10)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger("count") ?? 10;
    const top = getLeaderboard(count);
    if (top.length === 0) {
        return interaction.reply("No data available.");
    }

    const description = top
        .map((rec, idx) => `${idx + 1}. <@${rec.id}> - level ${rec.level} (${rec.xp} XP)`)
        .join("\n");

    const embed = new EmbedBuilder()
        .setTitle("🏆 Levels Leaderboard")
        .setDescription(description)
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });
}
