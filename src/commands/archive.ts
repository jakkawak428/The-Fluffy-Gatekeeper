import {SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, TextChannel} from 'discord.js';
import {ARCHIVE_CATEGORY, ARCHIVE_CATEGORY_2} from '../config/serverConfig';

export const command = new SlashCommandBuilder()
    .setName("archive")
    .setDescription("Moves the current channel to the FFF Channel Archive (Staff only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction){
    
    if (!interaction.guild) {
        await interaction.reply("This command can only be used in the FFF server!");
        return;
    }

    const archiveCategoryIds = [ARCHIVE_CATEGORY, ARCHIVE_CATEGORY_2];
    const validArchiveCategoryIds = archiveCategoryIds.filter((categoryId) => {
        const category = interaction.guild?.channels.cache.get(categoryId);
        return category?.type === ChannelType.GuildCategory;
    });

    if (validArchiveCategoryIds.length === 0) {
        await interaction.reply("An error occurred! No valid archive category was found.");
        return;
    }

    if (interaction.channel && 'parentId' in interaction.channel && validArchiveCategoryIds.includes(interaction.channel.parentId ?? "")) {
        await interaction.reply("This channel is already in the archive.");
        return;
    }

    try {
        if (interaction.channel && 'setParent' in interaction.channel) {
            const targetArchiveCategoryId = validArchiveCategoryIds.find((categoryId) => {
                const childCount = interaction.guild?.channels.cache.filter(
                    (channel) => channel.parentId === categoryId
                ).size ?? 0;

                return childCount < 50;
            });

            if (!targetArchiveCategoryId) {
                await interaction.reply("Both archive categories are full (50 channels each). Create another archive category and update config.");
                return;
            }

            await interaction.channel.setParent(targetArchiveCategoryId);
            await interaction.reply("Channel archived successfully!");
        } else {
            await interaction.reply("This command can only be used in a guild channel!");
        }
    } catch (error) {
        console.error("Error archiving channel:", error);
        if (!interaction.replied) {
            await interaction.reply("An error occurred while moving the channel to the archive! Try again or check console.");
        }
    }

}