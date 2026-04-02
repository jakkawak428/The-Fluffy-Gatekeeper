import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserLevel } from "../handlers/levelHandler";

export const command = new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your current level and XP");

export async function execute(interaction: ChatInputCommandInteraction) {
    const data = getUserLevel(interaction.user.id);
    const xpToNext = 100 * data.level * data.level - data.xp; // same formula as handler

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`${interaction.user.username}'s Level`)
        .addFields(
            { name: "Level", value: data.level.toString(), inline: true },
            { name: "XP", value: `${data.xp} / ${100 * data.level * data.level}`, inline: true },
            { name: "To next level", value: xpToNext.toString(), inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}
