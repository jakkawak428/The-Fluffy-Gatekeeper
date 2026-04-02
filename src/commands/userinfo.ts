import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from "discord.js";

export const command = new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("The user to get info about")
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const user: User = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild?.members.fetch(user.id);

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setThumbnail(user.displayAvatarURL())
        .setTitle(`User Info - ${user.username}`)
        .addFields(
            { name: "Username", value: user.username, inline: true },
            { name: "User ID", value: user.id, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Bot", value: user.bot ? "Yes" : "No", inline: true }
        );

    if (member) {
        embed.addFields(
            { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
            { name: "Roles", value: member.roles.cache.size > 1 ? `${member.roles.cache.size - 1} roles` : "No roles", inline: true }
        );
    }

    await interaction.reply({ embeds: [embed] });
}
