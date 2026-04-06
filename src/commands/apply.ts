import {
    ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import { PENDING_APPLICATIONS, MODERATOR_ROLE } from "../config/serverConfig";

const APPLICATION_MODAL_ID = "moderator_application_modal";
const APPLICATION_BUTTON_PREFIX = "moderator_application";

// Checks if the given title and description match the expected format for a user's application message

function isUsersApplicationMessage(userId: string, title?: string | null, description?: string | null): boolean {
    if (title !== "New Moderator Application") {
        return false;
    }

    return Boolean(description?.includes(`(\`${userId}\`)`));
}

async function getLatestApplicationAcceptedState(interaction: ChatInputCommandInteraction): Promise<boolean | null> {
    const pendingChannel = await interaction.guild?.channels.fetch(PENDING_APPLICATIONS);
    if (!pendingChannel?.isTextBased()) {
        return null;
    }

    let before: string | undefined;
    for (let page = 0; page < 5; page++) {
        const messages = before
            ? await pendingChannel.messages.fetch({ limit: 100, before })
            : await pendingChannel.messages.fetch({ limit: 100 });
        if (!messages.size) {
            return null;
        }

        for (const message of messages.values()) {
            if (message.author.id !== interaction.client.user?.id) {
                continue;
            }

            const applicationEmbed = message.embeds[0];
            if (!applicationEmbed) {
                continue;
            }

            if (!isUsersApplicationMessage(interaction.user.id, applicationEmbed.title, applicationEmbed.description)) {
                continue;
            }

            return message.content.startsWith("Application Accepted");
        }

        before = messages.last()?.id;
        if (!before) {
            break;
        }
    }

    return null;
}

const APPLICATION_FIELDS = [
    {id: "application_q1", label: "Restate ALL of the rules.", style: TextInputStyle.Paragraph},
    {id: "application_q2", label: "Do you have moderator experience?", style: TextInputStyle.Paragraph},
    {id: "application_q3", label: "How would you handle conflicts?", style: TextInputStyle.Paragraph},
    {id: "application_q4", label: "What is your current level? (use /rank)", style: TextInputStyle.Paragraph},
    {id: "application_q5", label: "Why are you applying?", style: TextInputStyle.Paragraph}
] as const;

export const command = new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Submit a moderator application");

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply("This command can only be used in the FFF server.");
        return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(MODERATOR_ROLE)) {
        await interaction.reply("You are already a moderator!");
        return;
    }

    const latestApplicationAcceptedState = await getLatestApplicationAcceptedState(interaction);
    if (member.roles.cache.has(MODERATOR_ROLE)) {
        await interaction.reply("You are already a moderator!");
        return;
    }

    if (latestApplicationAcceptedState === false) {
        await interaction.reply("You can't apply again until your previous application has been reviewed!");
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(APPLICATION_MODAL_ID)
        .setTitle("Moderator Application");

    const rows = APPLICATION_FIELDS.map((field) => {
            const input = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setStyle(field.style)
                .setRequired(true)
                .setMaxLength(1024);
    
            return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
        });

    modal.addComponents(...rows);
    await interaction.showModal(modal);

    const modalSubmit = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === APPLICATION_MODAL_ID && i.user.id === interaction.user.id,
        time: 15 * 60 * 1000
    }).catch(() => null);

    if (!modalSubmit) {
        await interaction.followUp({
            content: "You did not submit the application in time. Please run the command again when you're ready.",
            ephemeral: true
        });
        return;
    }

    const answers = APPLICATION_FIELDS.map((field) => ({
        label: field.label,
        value: modalSubmit.fields.getTextInputValue(field.id)
    }));

    const pendingChannel = await interaction.guild.channels.fetch(PENDING_APPLICATIONS);
    if (!pendingChannel?.isTextBased()) {
        await interaction.followUp({
            content: "There was an error submitting your application. Please contact a moderator for assistance.",
            ephemeral: true
        });
        return;
    }

    const summaryEmbed = new EmbedBuilder()
        .setTitle("New Moderator Application")
        .setDescription(`A new moderator application has been submitted by <@${interaction.user.id}> (\`${interaction.user.id}\`).`)
        .addFields(
			answers.map((answer) => ({
				name: answer.label,
				value: answer.value.length > 1024 ? `${answer.value.slice(0, 1021)}...` : answer.value
			}))
		)
        .setFooter({text: `User ID: ${interaction.user.id}`})
        .setTimestamp();

    const acceptButton = new ButtonBuilder()
        .setCustomId(`${APPLICATION_BUTTON_PREFIX}:accept:${interaction.user.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
        .setCustomId(`${APPLICATION_BUTTON_PREFIX}:reject:${interaction.user.id}`)
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton);

	await pendingChannel.send({
		content: `<@${MODERATOR_ROLE}> A new verification application has been submitted. Please review and take action.`,
		embeds: [summaryEmbed],
		components: [actionRow]
	});

	await modalSubmit.reply({
		content: "Your application was submitted and is now pending moderator review.",
		ephemeral: true
	});

}