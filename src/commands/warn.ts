import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";

const FIRST_WARNING_ROLE = "1355407834241700051";
const SECOND_WARNING_ROLE = "1382155408591814686";
const TIMEOUT_ROLE = "1353093173034881036";
const WARN_CHANNEL_ID = "1390137382636093532";

export const command = new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName("user")
            .setDescription("The user to warn")
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName("reason")
            .setDescription("The reason for the warning")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    // Ensure we're in a guild
    if (!interaction.guild) {
        await interaction.reply("This command can only be used in a guild.");
        return;
    }

    try {
        const member = await interaction.guild.members.fetch(targetUser.id);

        // Check current warning status
        const hasFirstWarning = member.roles.cache.has(FIRST_WARNING_ROLE);
        const hasSecondWarning = member.roles.cache.has(SECOND_WARNING_ROLE);

        let warningCount = 0;

        if (hasFirstWarning && hasSecondWarning) {
            // Already warned twice - ask for confirmation before timeout
            warningCount = 2;
            const confirmButton = new ButtonBuilder()
                .setCustomId("confirm_timeout")
                .setLabel("Confirm Timeout")
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId("cancel_timeout")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(confirmButton, cancelButton);

            const confirmMessage = await interaction.reply({
                content: `⚠️ ${targetUser} already has 2 warnings! Confirming will apply the timeout role for reason: **${reason}**\n\nAre you sure you want to proceed?`,
                components: [row],
                ephemeral: true
            });

            // Wait for button interaction with 60 second timeout
            const buttonInteraction = await confirmMessage.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            }).catch(() => null);

            if (!buttonInteraction) {
                await interaction.editReply({
                    content: "⏱️ Confirmation timeout - no action taken.",
                    components: []
                });
                return;
            }

            if (buttonInteraction.customId === "cancel_timeout") {
                await buttonInteraction.update({
                    content: "❌ Timeout cancelled.",
                    components: []
                });
                return;
            }

            // User confirmed - apply timeout
            await member.roles.add(TIMEOUT_ROLE);
            await buttonInteraction.update({
                content: `✅ Applied third warning and timeout to ${targetUser} for reason: **${reason}**`,
                components: []
            });

            // Send message to warn channel
            const warnChannel = await interaction.guild.channels.fetch(WARN_CHANNEL_ID);
            if (warnChannel && warnChannel instanceof TextChannel) {
                await warnChannel.send(`<@${targetUser.id}> is on their 3rd warning for ${reason}.`);
            }
        } else if (hasFirstWarning) {
            // Add second warning
            await member.roles.add(SECOND_WARNING_ROLE);
            warningCount = 2;

            const warnChannel = await interaction.guild.channels.fetch(WARN_CHANNEL_ID);
            if (warnChannel && warnChannel instanceof TextChannel) {
                await warnChannel.send(`<@${targetUser.id}> is on their 2nd warning for ${reason}.`);
            }

            await interaction.reply(`✅ ${targetUser} has been warned (warning #${warningCount}) for: ${reason}`);
        } else {
            // Add first warning
            await member.roles.add(FIRST_WARNING_ROLE);
            warningCount = 1;

            const warnChannel = await interaction.guild.channels.fetch(WARN_CHANNEL_ID);
            if (warnChannel && warnChannel instanceof TextChannel) {
                await warnChannel.send(`<@${targetUser.id}> is on their 1st warning for ${reason}.`);
            }

            await interaction.reply(`✅ ${targetUser} has been warned (warning #${warningCount}) for: ${reason}`);
        }
    } catch (error) {
        console.error("Error in warn command:", error);
        await interaction.reply("❌ An error occurred while trying to warn this user.");
    }
}
