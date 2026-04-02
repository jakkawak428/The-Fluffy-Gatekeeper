import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, CategoryChannel } from 'discord.js';

const command = new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore a channel from the FFF Channel Archive')
    .addChannelOption(option =>
        option
            .setName('channel')
            .setDescription('The archived channel to restore')
            .setRequired(true)
    )
    .addChannelOption(option =>
        option
            .setName('category')
            .setDescription('Category to restore the channel to')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const archivedChannel = interaction.options.getChannel('channel', true);
    const targetCategory = interaction.options.getChannel('category', true);
    const guild = interaction.guild;

    if (!guild) {
        return interaction.editReply('This command can only be used in a guild.');
    }

    try {
        // Verify the channel is in an archive category
        if (!('parentId' in archivedChannel) || !archivedChannel.parentId) {
            return interaction.editReply('This channel is not in a category.');
        }

        const parentCategory = guild.channels.cache.get(archivedChannel.parentId);
        if (!parentCategory || !parentCategory.name.toLowerCase().includes('archive')) {
            return interaction.editReply('That channel isn\'t in the archive!');
        }

        // Restore the channel
        if ('setParent' in archivedChannel) {
            await archivedChannel.setParent(targetCategory.id);
        } else {
            return interaction.editReply('This channel type cannot be restored.');
        }
        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Channel Restored')
            .addFields(
                { name: 'Channel', value: `<#${archivedChannel.id}>` },
                { name: 'Category', value: `${targetCategory.name}` }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while restoring the channel.');
    }
}

export { command, execute };